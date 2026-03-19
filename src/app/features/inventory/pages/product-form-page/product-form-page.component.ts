import { Component, computed, inject, signal, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft, lucideArrowRight, lucidePackage, lucideWrench, lucidePlus, lucideTrash2,
  lucideTag, lucideFolder, lucideImage, lucideInfo, lucideCheck,
  lucideLayers, lucideBox, lucideAlertCircle, lucideChevronRight,
  lucideZap, lucideSettings2, lucideDollarSign, lucideHash,
  lucideBarcode
} from '@ng-icons/lucide';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../../../core/services/category.service';
import { BrandService } from '../../../../core/services/brand.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VariantDrawerComponent } from '../../components/variant-drawer/variant-drawer.component';
import { AttributeConfiguratorComponent } from '../../components/attribute-configurator/attribute-configurator.component';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { AsFormGroupPipe } from '../../../../shared/pipes/as-form-group.pipe';
import { CategoryAttributeType, CreateProductPayload } from '../../models/product.model';
import { map, Subscription } from 'rxjs';


@Component({
  selector: 'app-product-form-page',
  standalone: true,
  templateUrl: './product-form-page.html',
  styleUrls: ['./product-form-page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIconComponent,
    SearchSelectComponent,
    VariantDrawerComponent,
    AttributeConfiguratorComponent,
    ModalComponent,
    FormButtonComponent
  ],
  providers: [
    provideIcons({
      lucideArrowLeft, lucideArrowRight, lucidePackage, lucideWrench, lucidePlus, lucideTrash2,
      lucideTag, lucideFolder, lucideImage, lucideInfo, lucideCheck,
      lucideLayers, lucideBox, lucideAlertCircle, lucideChevronRight,
      lucideZap, lucideSettings2, lucideDollarSign, lucideHash, lucideBarcode
    })
  ],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class ProductFormPageComponent implements OnInit, OnDestroy {
  private fb          = inject(FormBuilder);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);
  private productSvc  = inject(ProductService);
  private categorySvc = inject(CategoryService);
  private brandSvc    = inject(BrandService);
  private toastSvc    = inject(ToastService);

  // ── UI state ──────────────────────────────────────────────────────────────
  isSubmitting = signal(false);
  isEditing    = signal(false);
  productId    = signal<string | null>(null);

  selectedCategoryOption = signal<SearchSelectOption | undefined>(undefined);
  selectedBrandOption    = signal<SearchSelectOption | undefined>(undefined);
  imagePreview = signal<string | null>(null);

  // Category attributes — loaded by configurator or pre-loaded in edit mode
  categoryAttributes        = signal<CategoryAttributeType[]>([]);
  initialCategoryAttributes = signal<CategoryAttributeType[]>([]);
  simpleMargin              = signal<number | null>(null);

  private priceSub?: Subscription;

  // Variants management drawer
  isDrawerOpen = signal(false);
  editingVariantIndex = signal<number | null>(null);
  draftVariantForm = signal<FormGroup | null>(null);
  isVariantExitModalOpen = signal(false);

  @ViewChild(VariantDrawerComponent) variantDrawer!: VariantDrawerComponent;

  step = signal<1 | 2>(1);

  // ── Form ──────────────────────────────────────────────────────────────────
  form!: FormGroup;

  get typeCtrl()     { return this.form.get('type')!; }
  get hasVariants()  { return this.form.get('hasVariants')!; }
  get variants()     { return this.form.get('variants') as FormArray; }
  get simpleVariant(){ return this.form.get('simpleVariant') as FormGroup; }

  get showVariantStep(): boolean { return this.form?.get('hasVariants')?.value === true; }
  get isService(): boolean { return this.form?.get('type')?.value === 'SERVICE'; }

  ngOnInit() {
    this.buildForm();
    this.checkEditMode();
  }

  ngOnDestroy() {
    this.priceSub?.unsubscribe();
  }

  private checkEditMode() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditing.set(true);
      this.productId.set(id);
      this.loadProduct(id);
    }
  }

  private loadProduct(id: string) {
    this.productSvc.findOne(id).subscribe({
      next: (product) => {
        // Load category attributes first, then patch form
        if (product.categoryId) {
          this.categorySvc.getCategoryAttributes(product.categoryId).subscribe({
            next: attrs => {
              this.categoryAttributes.set(attrs);
              this.initialCategoryAttributes.set(attrs);
              this.patchForm(product);
            },
            error: () => this.patchForm(product)
          });
        } else {
          this.patchForm(product);
        }
      },
      error: () => this.toastSvc.error('Error al cargar el producto')
    });
  }

  private patchForm(p: any) {
    this.form.patchValue({
      name:        p.name,
      description: p.description,
      type:        p.type,
      categoryId:  p.categoryId,
      brandId:     p.brandId,
      isActive:    p.isActive,
      hasVariants: p.variants?.length > 1 || (p.variants?.length === 1 && p.variants[0].name !== p.name)
    });

    if (p.category) {
      this.selectedCategoryOption.set({ label: p.category.name, value: p.category.id, icon: 'lucideFolder' });
    }
    if (p.brand) {
      this.selectedBrandOption.set({ label: p.brand.name, value: p.brand.id, icon: 'lucideTag' });
    }
    if (p.imageUrl) this.imagePreview.set(p.imageUrl);

    if (this.hasVariants.value) {
      this.variants.clear();
      p.variants.forEach((v: any) => {
        this.variants.push(this.buildVariant(v.attributeValues, v));
      });
    } else if (p.variants?.length === 1) {
      const v = p.variants[0];
      this.rebuildSimpleVariantAttributes(this.categoryAttributes(), v.attributeValues ?? []);
      this.simpleVariant.patchValue({
        id:             v.id,
        sku:            v.sku,
        barcode:        v.barcode,
        costPrice:      v.costPrice,
        salePrice:      v.salePrice,
        taxIds:         v.variantTaxes?.map((vt: any) => vt.taxId) || [],
        stockTrackable: v.stockTrackable ?? true,
        durationMinutes: v.durationMinutes ?? null,
      });
    }
  }

  // ── Form builder ──────────────────────────────────────────────────────────
  private buildForm() {
    this.form = this.fb.group({
      name:        ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      type:        ['PHYSICAL'],
      categoryId:  ['', Validators.required],
      brandId:     [''],
      isActive:    [true],
      hasVariants: [false],
      variants:    this.fb.array([]),
      simpleVariant: this.fb.group({
        id:              [null],
        sku:             [''],
        barcode:         [''],
        costPrice:       [null, [Validators.required, Validators.min(0)]],
        salePrice:       [null, [Validators.required, Validators.min(0.01)]],
        taxIds:          [[]],
        presentationId:  [''],
        stockTrackable:  [true],
        durationMinutes: [null],
        isDefault:       [true],
        attributes:      this.fb.group({})
      })
    });

    this.hasVariants.valueChanges.subscribe(() => this.syncValidators());
    this.priceSub = this.simpleVariant.valueChanges.subscribe(v => {
      const sale = Number(v.salePrice) || 0;
      const cost = Number(v.costPrice) || 0;
      this.simpleMargin.set(sale > 0 ? ((sale - cost) / sale) * 100 : null);
    });
    this.form.get('categoryId')!.valueChanges.subscribe(id => this.onCategorySelected(id));
    this.typeCtrl.valueChanges.subscribe(type => {
      // When switching to SERVICE, auto-disable stock tracking
      if (type === 'SERVICE') {
        this.simpleVariant.get('stockTrackable')?.setValue(false);
      } else {
        this.simpleVariant.get('stockTrackable')?.setValue(true);
      }
      this.syncValidators();
    });
    this.syncValidators();
  }

  private syncValidators() {
    if (this.hasVariants.value) {
      this.simpleVariant.disable();
    } else {
      this.simpleVariant.enable();
    }
  }

  buildVariant(existingAttrValues?: any[], existingVariant?: any): FormGroup {
    // Build attributes sub-group dynamically from current category attributes
    const attrsGroup: Record<string, any> = {};
    for (const cat of this.categoryAttributes()) {
      const attrId = cat.attributeTypeId;
      const existing = existingAttrValues?.find((av: any) => av.attributeTypeId === attrId);
      const value = existing
        ? (cat.attributeType.dataType === 'NUMBER' ? existing.valueNumber : existing.valueText) ?? ''
        : '';
      const validators = cat.isRequired ? [Validators.required] : [];
      attrsGroup[attrId] = [value, validators];
    }

    return this.fb.group({
      id:              [existingVariant?.id ?? null],
      name:            [existingVariant?.name ?? '', Validators.required],
      sku:             [existingVariant?.sku ?? ''],
      barcode:         [existingVariant?.barcode ?? ''],
      presentationId:  [existingVariant?.presentationId ?? ''],
      unitsPerPack:    [existingVariant?.unitsPerPack ?? 1, [Validators.required, Validators.min(1)]],
      costPrice:       [existingVariant?.costPrice ?? 0, [Validators.required, Validators.min(0)]],
      salePrice:       [existingVariant?.salePrice ?? 0, [Validators.required, Validators.min(0)]],
      stockTrackable:  [existingVariant?.stockTrackable ?? true],
      durationMinutes: [existingVariant?.durationMinutes ?? null],
      taxIds:          [existingVariant?.variantTaxes?.map((vt: any) => vt.taxId) ?? []],
      attributes:      this.fb.group(attrsGroup),
    });
  }

  // ── Category selection — reset attributes (configurator handles loading) ──
  onCategorySelected(categoryId: string) {
    if (!categoryId) {
      this.categoryAttributes.set([]);
    }
    // categoryAttributes are set via onAttributesConfigured from the configurator
  }

  // ── Attribute configurator output ─────────────────────────────────────────
  onAttributesConfigured(attrs: CategoryAttributeType[]) {
    this.categoryAttributes.set(attrs);
    this.rebuildSimpleVariantAttributes(attrs);
  }

  private rebuildSimpleVariantAttributes(attrs: CategoryAttributeType[], existingValues: any[] = []) {
    const attrsGroup = this.simpleVariant.get('attributes') as FormGroup;
    Object.keys(attrsGroup.controls).forEach(k => attrsGroup.removeControl(k));
    for (const cat of attrs) {
      const existing = existingValues.find(av => av.attributeTypeId === cat.attributeTypeId);
      const value = existing
        ? (cat.attributeType.dataType === 'NUMBER' ? existing.valueNumber : existing.valueText) ?? ''
        : '';
      attrsGroup.addControl(cat.attributeTypeId, this.fb.control(value, cat.isRequired ? [Validators.required] : []));
    }
  }

  // ── Type selector ─────────────────────────────────────────────────────────
  selectType(t: 'PHYSICAL' | 'SERVICE') {
    this.typeCtrl.setValue(t);
  }

  // ── Variant management ────────────────────────────────────────────────────
  addVariant() {
    this.draftVariantForm.set(this.buildVariant());
    this.editingVariantIndex.set(null);
    this.isDrawerOpen.set(true);
  }

  removeVariant(i: number) {
    if (this.variants.length > 1) {
      this.variants.removeAt(i);
    }
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  goToVariantStep() {
    this.markBasicAsTouched();
    if (this.basicFieldsValid()) this.step.set(2);
  }

  goBack() {
    if (this.step() === 2) {
      this.step.set(1);
    } else {
      this.router.navigate(['/inventario/productos']);
    }
  }

  private markBasicAsTouched() {
    ['name', 'categoryId'].forEach(c => this.form.get(c)?.markAsTouched());
  }

  private basicFieldsValid(): boolean {
    return ['name', 'categoryId'].every(c => this.form.get(c)?.valid);
  }

  // ── Drawer ────────────────────────────────────────────────────────────────
  openEditDrawer(index: number) {
    this.draftVariantForm.set(this.variants.at(index) as FormGroup);
    this.editingVariantIndex.set(index);
    this.isDrawerOpen.set(true);
  }

  saveDrawerVariant(form: FormGroup) {
    form.markAllAsTouched();
    if (form.invalid) return;
    if (this.editingVariantIndex() === null) {
      this.variants.push(form);
    }
    this.closeDrawer();
  }

  handleDrawerClose() {
    if (this.variantDrawer?.hasUnsavedChanges()) {
      this.isVariantExitModalOpen.set(true);
    } else {
      this.closeDrawer();
    }
  }

  confirmExitVariant() {
    this.isVariantExitModalOpen.set(false);
    this.closeDrawer();
  }

  cancelExitVariant() {
    this.isVariantExitModalOpen.set(false);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.editingVariantIndex.set(null);
    this.draftVariantForm.set(null);
  }

  // ── Search fns ────────────────────────────────────────────────────────────
  searchCategoriesFn(query: string, page: number) {
    return this.categorySvc.findAll({
      search: query, page, limit: 15,
      filterModel: { status: { filterType: 'text', type: 'equals', filter: 'ACTIVE' } }
    }).pipe(
      map(res => ({
        data: res.data.map((c: any) => ({ label: c.name, value: c.id, icon: 'lucideFolder' } as SearchSelectOption)),
        hasMore: res.data.length === 15
      }))
    );
  }

  searchBrandsFn(query: string, page: number) {
    return this.brandSvc.findAll({ search: query, page, limit: 15 }).pipe(
      map((res: any) => {
        const items = Array.isArray(res) ? res : (res.data ?? []);
        return {
          data: items.map((b: any) => ({ label: b.name, value: b.id } as SearchSelectOption)),
          hasMore: items.length === 15
        };
      })
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit() {
    this.form.markAllAsTouched();
    if (!this.basicFieldsValid()) {
      this.step.set(1);
      return;
    }

    const val = this.form.value;
    let variantPayload: any[];

    if (val.hasVariants) {
      if (this.variants.invalid) return;
      variantPayload = val.variants.map((v: any) => this.mapVariant(v));
    } else {
      variantPayload = [this.mapSimpleVariant(val.simpleVariant, val.name, val.type)];
    }

    const payload: CreateProductPayload = {
      name:        val.name,
      description: val.description || undefined,
      type:        val.type,
      categoryId:  val.categoryId,
      brandId:     val.brandId || undefined,
      isActive:    val.isActive,
      variants:    variantPayload
    };

    this.isSubmitting.set(true);
    const obs$ = this.isEditing()
      ? this.productSvc.update(this.productId()!, payload)
      : this.productSvc.create(payload);

    obs$.subscribe({
      next: res => {
        const msg = this.isEditing() ? 'Producto actualizado' : `Producto "${res.name}" creado`;
        this.toastSvc.success(`${msg} exitosamente`);
        this.router.navigate(['/inventario/productos']);
      },
      error: () => {
        this.toastSvc.error('Error al guardar el producto');
        this.isSubmitting.set(false);
      }
    });
  }

  private mapSimpleVariant(sv: any, productName: string, type: string) {
    const attributeValues = this.buildAttributeValues(sv.attributes ?? {});
    return {
      id:              sv.id || undefined,
      name:            productName,
      sku:             sv.sku      || undefined,
      barcode:         sv.barcode  || undefined,
      costPrice:       Number(sv.costPrice),
      salePrice:       Number(sv.salePrice),
      taxIds:          sv.taxIds?.length ? sv.taxIds : undefined,
      stockTrackable:  type !== 'SERVICE',
      durationMinutes: type === 'SERVICE' && sv.durationMinutes ? Number(sv.durationMinutes) : undefined,
      unitsPerPack:    type !== 'SERVICE' ? 1 : undefined,
      attributeValues: attributeValues.length ? attributeValues : undefined,
    };
  }

  private mapVariant(v: any) {
    const attributeValues = this.buildAttributeValues(v.attributes);
    return {
      id:              v.id || undefined,
      name:            v.name,
      sku:             v.sku      || undefined,
      barcode:         v.barcode  || undefined,
      presentationId:  v.presentationId || undefined,
      unitsPerPack:    v.stockTrackable ? Number(v.unitsPerPack) : undefined,
      costPrice:       Number(v.costPrice),
      salePrice:       Number(v.salePrice),
      taxIds:          v.taxIds?.length ? v.taxIds : undefined,
      stockTrackable:  v.stockTrackable ?? true,
      durationMinutes: (!v.stockTrackable && v.durationMinutes) ? Number(v.durationMinutes) : undefined,
      attributeValues: attributeValues.length ? attributeValues : undefined,
    };
  }

  private buildAttributeValues(attrs: Record<string, any> = {}) {
    return this.categoryAttributes()
      .map(cat => {
        const value = attrs[cat.attributeTypeId];
        if (value === null || value === undefined || value === '') return null;
        return {
          attributeTypeId: cat.attributeTypeId,
          valueText:   cat.attributeType.dataType !== 'NUMBER' ? String(value) : null,
          valueNumber: cat.attributeType.dataType === 'NUMBER'  ? Number(value) : null,
        };
      })
      .filter(Boolean) as any[];
  }
}
