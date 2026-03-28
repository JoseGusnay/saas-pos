import {
  Component,
  inject,
  signal,
  OnInit,
  DestroyRef,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft, lucideCheck, lucidePlus, lucideTrash2,
  lucideChevronRight, lucideSettings2, lucideFolder,
  lucideLayers, lucideGift, lucideLeaf,
  lucideWrench, lucideZap, lucideInfo, lucideCopy
} from '@ng-icons/lucide';

import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../../../core/services/category.service';
import { TaxService } from '../../../../core/services/tax.service';
import { UnitsService } from '../../../../core/services/units.service';
import { PresentationService } from '../../../../core/services/presentation.service';
import { ToastService } from '../../../../core/services/toast.service';

import { VariantDrawerComponent } from '../../components/variant-drawer/variant-drawer.component';
import { ProductGeneralInfoComponent } from '../../components/product-general-info/product-general-info.component';
import { PhysicalVariantFormComponent } from '../../components/physical-variant-form/physical-variant-form.component';
import { ServiceVariantFormComponent } from '../../components/service-variant-form/service-variant-form.component';
import { RawMaterialFormComponent } from '../../components/raw-material-form/raw-material-form.component';
import { ComboBuilderComponent } from '../../components/combo-builder/combo-builder';
import { ModifierBuilderComponent } from '../../components/modifier-builder/modifier-builder.component';
import { RecipeBuilderComponent } from '../../components/recipe-builder/recipe-builder.component';

import { ToggleSwitchComponent } from '../../../../shared/components/ui/toggle-switch/toggle-switch';
import { ImageUploadComponent } from '../../../../shared/components/ui/image-upload/image-upload';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';

import { BackButtonComponent } from '../../../../shared/components/ui/back-button/back-button';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { CategoryAttributeType, CreateProductPayload } from '../../models/product.model';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { map, switchMap, of, catchError } from 'rxjs';

@Component({
  selector: 'app-product-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIconComponent,
    ProductGeneralInfoComponent,
    PhysicalVariantFormComponent,
    ServiceVariantFormComponent,
    RawMaterialFormComponent,
    ToggleSwitchComponent,
    ImageUploadComponent,
    FormButtonComponent,
    ModalComponent,
    SearchSelectComponent,
    VariantDrawerComponent,
    ComboBuilderComponent,
    ModifierBuilderComponent,
    RecipeBuilderComponent,
    FieldInputComponent,
    BackButtonComponent
  ],
  providers: [
    provideIcons({
      lucideArrowLeft, lucideCheck, lucidePlus, lucideTrash2,
      lucideFolder, lucideChevronRight, lucideSettings2,
      lucideLayers, lucideGift, lucideLeaf,
      lucideWrench, lucideZap, lucideInfo, lucideCopy
    })
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-6px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  templateUrl: './product-form-page.html',
  styleUrls: ['./product-form-page.scss']
})
export class ProductFormPageComponent implements OnInit, HasUnsavedChanges {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private productSvc = inject(ProductService);
  private categorySvc = inject(CategoryService);
  private taxSvc = inject(TaxService);
  private unitsSvc = inject(UnitsService);
  private presentationSvc = inject(PresentationService);
  private toastSvc = inject(ToastService);

  savedSuccessfully = false;
  isDirty = () => this.form?.dirty ?? false;

  // ── State ──────────────────────────────────────────────────────────────────
  isSubmitting = signal(false);
  isEditing = signal(false);
  productId = signal<string | null>(null);
  isLoadingProduct = signal(false);
  typePreset = signal(false); // true cuando el tipo viene de query param (ya elegido en pantalla anterior)

  initialCategoryOption = signal<SearchSelectOption | undefined>(undefined);
  initialBrandOption    = signal<SearchSelectOption | undefined>(undefined);
  initialTaxOptions     = signal<SearchSelectOption[]>([]);
  initialUnitOption     = signal<SearchSelectOption | undefined>(undefined);
  initialPresentationOption = signal<SearchSelectOption | undefined>(undefined);

  imagePreviewUrl = signal<string | null>(null);
  imagePublicId = signal<string | null>(null);
  selectedImageFile = signal<File | null>(null);
  isUploadingImage = signal(false);
  uploadProgressLabel = signal<string | null>(null);

  categoryAttributes = signal<CategoryAttributeType[]>([]);
  initialCategoryAttributes = signal<CategoryAttributeType[]>([]);

  isDrawerOpen = signal(false);
  editingVariantIndex = signal<number | null>(null);
  draftVariantForm = signal<FormGroup | null>(null);
  isVariantExitModalOpen = signal(false);
  isVariantClearModalOpen = signal(false);
  isVariantDeleteModalOpen = signal(false);
  variantDeleteIndex = signal<number | null>(null);

  step = signal<1 | 2>(1);

  @ViewChild(VariantDrawerComponent) variantDrawer!: VariantDrawerComponent;

  // ── Form ──────────────────────────────────────────────────────────────────
  form!: FormGroup;

  get typeCtrl() { return this.form.get('type')!; }
  get hasVariants() { return this.form.get('hasVariants')!; }
  get variants() { return this.form.get('variants') as FormArray; }
  get comboItems() { return this.form.get('comboItems') as FormArray; }
  get comboPriceModeCtrl() { return this.form.get('comboPriceMode')!; }
  get modifierGroups() { return this.form.get('modifierGroups') as FormArray; }
  get simpleVariant() { return this.form.get('simpleVariant') as FormGroup; }
  get isService() { return this.typeCtrl.value === 'SERVICE'; }
  get isPhysical() { return this.typeCtrl.value === 'PHYSICAL'; }
  get isCombo() { return this.typeCtrl.value === 'COMBO'; }
  get isRawMaterial() { return this.typeCtrl.value === 'RAW_MATERIAL'; }
  get isComboPriceFixed() { return this.comboPriceModeCtrl.value === 'FIXED'; }
  get hasChoiceGroups() { return this.comboItems.controls.some(c => c.get('choiceGroup') !== null); }
  get showVariantStep() { return this.hasVariants.value === true; }

  // ── Copy contextual por tipo ────────────────────────────────────────────
  get typeLabel(): string {
    if (this.isService) return 'Servicio';
    if (this.isCombo) return 'Combo';
    if (this.isRawMaterial) return 'Materia Prima';
    return 'Producto';
  }

  get pageTitle(): string {
    if (this.isEditing()) {
      if (this.isService) return 'Editar Servicio';
      if (this.isCombo) return 'Editar Combo';
      if (this.isRawMaterial) return 'Editar Materia Prima';
      return 'Editar Producto';
    }
    if (this.isService) return 'Nuevo Servicio';
    if (this.isCombo) return 'Nuevo Combo';
    if (this.isRawMaterial) return 'Nueva Materia Prima';
    return 'Nuevo Producto';
  }

  get variantNoun(): string {
    if (this.isService) return 'modalidad';
    if (this.isRawMaterial) return 'formato';
    return 'variante';
  }

  get variantNounPlural(): string {
    if (this.isService) return 'modalidades';
    if (this.isRawMaterial) return 'formatos';
    return 'variantes';
  }

  get variantNounCap(): string {
    if (this.isService) return 'Modalidad';
    if (this.isRawMaterial) return 'Formato';
    return 'Variante';
  }

  get variantNounPluralCap(): string {
    if (this.isService) return 'Modalidades';
    if (this.isRawMaterial) return 'Formatos';
    return 'Variantes';
  }

  get step2Title(): string {
    if (this.isService) return 'Modalidades del Servicio';
    if (this.isRawMaterial) return 'Formatos del Insumo';
    return 'Gestión de Variantes';
  }

  get step2Subtitle(): string {
    if (this.isService) return 'Configura precio, duración e impuestos por cada modalidad.';
    if (this.isRawMaterial) return 'Configura costo, unidad y SKU por cada formato.';
    return 'Configura precio, SKU e impuestos por cada variante.';
  }

  get imageLabel(): string {
    if (this.isService) return 'Imagen del Servicio';
    if (this.isCombo) return 'Imagen del Combo';
    if (this.isRawMaterial) return 'Imagen del Insumo';
    return 'Imagen del Producto';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.buildForm();
    this.checkEditMode();
  }


  private checkEditMode() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditing.set(true);
      this.productId.set(id);
      this.loadProduct(id);
      return;
    }

    // Tipo pre-seleccionado desde la pantalla de tipo
    const tipoParam = this.route.snapshot.queryParams['tipo'];
    const validTypes = ['PHYSICAL', 'SERVICE', 'COMBO', 'RAW_MATERIAL'];
    if (tipoParam && validTypes.includes(tipoParam)) {
      this.typePreset.set(true);
      this.typeCtrl.setValue(tipoParam, { emitEvent: true });
    }
  }

  private loadProduct(id: string) {
    this.isLoadingProduct.set(true);
    this.productSvc.findOne(id).pipe(
      switchMap(product => {
        if (product.categoryId) {
          return this.categorySvc.getCategoryAttributes(product.categoryId).pipe(
            catchError(() => of([] as CategoryAttributeType[])),
            map(attrs => ({ product, attrs }))
          );
        }
        return of({ product, attrs: [] as CategoryAttributeType[] });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ product, attrs }) => {
        if (attrs.length) {
          this.categoryAttributes.set(attrs);
          this.initialCategoryAttributes.set(attrs);
        }
        this.patchForm(product);
        this.isLoadingProduct.set(false);
      },
      error: () => {
        this.toastSvc.error('Error al cargar el producto');
        this.isLoadingProduct.set(false);
      }
    });
  }

  private patchForm(p: any) {
    const hasVariantsValue = p.variants?.length > 1 ||
      (p.variants?.length === 1 && p.variants[0].name !== p.name);

    // type y categoryId se parchean sin emitir para no disparar los valueChanges
    // (typeCtrl fuerza isSellable/isPurchasable; categoryId lanza un fetch que limpia atributos)
    this.form.get('type')!.setValue(p.type, { emitEvent: false });
    this.form.get('categoryId')!.setValue(p.categoryId, { emitEvent: false });

    this.form.patchValue({
      name: p.name,
      description: p.description,
      comboPriceMode: p.comboPriceMode ?? 'CALCULATED',
      brandId: p.brandId,
      isActive: p.isActive,
      isSellable: p.isSellable ?? true,
      isPurchasable: p.isPurchasable ?? true,
    });

    this.hasVariants.setValue(hasVariantsValue, { emitEvent: false });
    this.syncValidators();

    if (p.categoryId && p.categoryName) {
      this.initialCategoryOption.set({ label: p.categoryName, value: p.categoryId, icon: 'lucideFolder' });
    }
    if (p.brandId && p.brandName) {
      this.initialBrandOption.set({ label: p.brandName, value: p.brandId });
    }

    if (!hasVariantsValue && p.variants?.length === 1) {
      const v0 = p.variants[0];
      if (v0.baseUnitId) {
        this.unitsSvc.findAll({ onlyActive: false }).subscribe({
          next: res => {
            const u = res.data.find((x: any) => x.id === v0.baseUnitId);
            if (u) this.initialUnitOption.set({ value: u.id, label: `${u.name} (${u.abbreviation})` });
          },
          error: () => {}
        });
      }
      const taxIds = p.variants[0].variantTaxes?.map((vt: any) => vt.taxId) ?? [];
      if (taxIds.length) {
        this.taxSvc.findAllSimple().subscribe({
          next: taxes => {
            const matched = taxes.filter((t: any) => taxIds.includes(t.id));
            this.initialTaxOptions.set(
              matched.map((t: any) => ({ value: t.id, label: `${t.name} (${t.percentage}%)` }))
            );
          },
          error: () => {}
        });
      }
    }

    if (p.imageUrl) this.imagePreviewUrl.set(p.imageUrl);
    if (p.imagePublicId) this.imagePublicId.set(p.imagePublicId);

    if (hasVariantsValue) {
      this.variants.clear();
      p.variants.forEach((v: any) => this.variants.push(this.buildVariant(v.attributeValues, v)));
    } else if (p.variants?.length === 1) {
      const v = p.variants[0];
      this.rebuildSimpleVariantAttributes(this.categoryAttributes(), v.attributeValues ?? []);
      if (v.presentationId) {
        this.presentationSvc.findOne(v.presentationId).subscribe({
          next: p => this.initialPresentationOption.set({ value: p.id, label: p.name }),
          error: () => {}
        });
      }
      this.simpleVariant.patchValue({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        presentationId: v.presentationId ?? '',
        baseUnitId: v.baseUnitId ?? '',
        conversionFactor: this.round2(v.conversionFactor) ?? 1,
        costPrice: this.round2(v.costPrice),
        salePrice: this.round2(v.salePrice),
        taxIds: v.variantTaxes?.map((vt: any) => vt.taxId) || [],
        stockTrackable: v.stockTrackable ?? true,
        trackLots: v.trackLots ?? false,
        trackExpiry: v.trackExpiry ?? false,
        durationMinutes: v.durationMinutes ?? null,
        minimumStock: v.minimumStock ?? null,
        maximumStock: v.maximumStock ?? null,
      });
      // Restore recipe
      if (v.recipe) {
        const recipeGroup = this.buildRecipeGroup(v.recipe);
        (this.simpleVariant as FormGroup).setControl('recipe', recipeGroup);
      }
    }

    // Restore modifier groups
    if (p.modifierGroups?.length > 0) {
      this.modifierGroups.clear();
      p.modifierGroups.forEach((g: any) => this.modifierGroups.push(this.buildModGroupFG(g)));
    }

    // Restore combo items
    if (p.type === 'COMBO' && p.comboItems?.length > 0) {
      this.comboItems.clear();
      p.comboItems.forEach((item: any) => {
        if (item.type === 'choice' && item.choiceGroup) {
          // Choice group item
          const cg = item.choiceGroup;
          this.comboItems.push(this.fb.group({
            quantity: [this.round2(item.quantity) || 1, [Validators.required, Validators.min(1)]],
            choiceGroup: this.fb.group({
              name: [cg.name ?? '', [Validators.required, Validators.maxLength(100)]],
              minSelections: [cg.minSelections ?? 1],
              maxSelections: [cg.maxSelections ?? 1],
              required: [cg.required ?? true],
              sortOrder: [cg.sortOrder ?? 0],
              options: this.fb.array((cg.options ?? []).map((o: any) => this.fb.group({
                variantId: [o.variantId, Validators.required],
                name: [o.name ?? o.variantName ?? ''],
                priceAdjustment: [this.round2(o.priceAdjustment) ?? 0],
                isDefault: [o.isDefault ?? false],
                sortOrder: [o.sortOrder ?? 0],
                salePrice: [this.round2(o.variantPrice ?? o.salePrice) ?? 0],
              }))),
            }),
          }));
        } else {
          // Fixed item
          this.comboItems.push(this.fb.group({
            productVariantId: [item.variantId, Validators.required],
            quantity: [this.round2(item.quantity) || 1, [Validators.required, Validators.min(1)]],
            variantName: [item.variantName ?? ''],
            productName: [item.productName ?? item.variantName ?? ''],
            sku: [item.sku ?? ''],
            salePrice: [this.round2(item.variantPrice ?? item.salePrice) ?? 0],
            modifierGroups: this.fb.array((item.modifierGroups ?? []).map((g: any) => this.buildModGroupFG(g))),
          }));
        }
      });
    }
  }

  private buildModGroupFG(g: any): FormGroup {
    const optionsArray = this.fb.array(
      (g.options ?? []).map((o: any) => this.fb.group({
        id: [o.id ?? null],
        name: [o.name ?? '', [Validators.required, Validators.maxLength(100)]],
        priceAdjustment: [this.round2(o.priceAdjustment ?? 0)],
        variantId: [o.variantId ?? null],
        variantName: [o.variantName && o.productName && o.variantName !== o.productName
          ? `${o.productName} — ${o.variantName}`
          : (o.productName ?? o.variantName ?? '')],
        isDefault: [o.isDefault ?? false],
        sortOrder: [o.sortOrder ?? 0]
      }))
    );
    return this.fb.group({
      id: [g.id ?? null],
      name: [g.name ?? '', [Validators.required, Validators.maxLength(100)]],
      minSelections: [g.minSelections ?? 0, [Validators.min(0)]],
      maxSelections: [g.maxSelections ?? 1, [Validators.required, Validators.min(1)]],
      required: [g.required ?? false],
      sortOrder: [g.sortOrder ?? 0],
      options: optionsArray
    });
  }

  // ── Form builder ──────────────────────────────────────────────────────────
  private buildForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      type: ['PHYSICAL'],
      comboPriceMode: ['CALCULATED'],
      categoryId: ['', Validators.required],
      brandId: [''],
      isActive: [true],
      isSellable: [true],
      isPurchasable: [true],
      hasVariants: [false],
      variants: this.fb.array([]),
      comboItems: this.fb.array([]),
      modifierGroups: this.fb.array([]),
      simpleVariant: this.fb.group({
        id: [null],
        sku: [''],
        barcode: [''],
        presentationId: [''],
        baseUnitId: [''],
        conversionFactor: [1, [Validators.min(0.0001)]],
        costPrice: [0, [Validators.min(0)]],
        salePrice: [null, [Validators.required, Validators.min(0.01)]],
        taxIds: [[]],
        stockTrackable: [true],
        trackLots: [false],
        trackExpiry: [false],
        durationMinutes: [null],
        minimumStock: [null],
        maximumStock: [null],
        isDefault: [true],
        attributes: this.fb.group({}),
        recipe: this.buildRecipeGroup(null)
      })
    });

    this.hasVariants.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(enabled => {
      if (!enabled && this.variants.length > 0 && this.variantsHaveData()) {
        this.hasVariants.setValue(true, { emitEvent: false });
        this.isVariantClearModalOpen.set(true);
        return;
      }
      this.applyHasVariantsChange(enabled);
    });

    this.typeCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(type => {
      if (type === 'SERVICE') {
        this.simpleVariant.patchValue(
          { sku: '', barcode: '', presentationId: '', trackLots: false, trackExpiry: false, stockTrackable: false },
          { emitEvent: false }
        );
        this.form.patchValue({ isPurchasable: false }, { emitEvent: false });
      } else if (type === 'COMBO') {
        this.simpleVariant.patchValue(
          { durationMinutes: null, stockTrackable: false, trackLots: false, trackExpiry: false, presentationId: '' },
          { emitEvent: false }
        );
        this.form.patchValue({ isPurchasable: false }, { emitEvent: false });
      } else if (type === 'RAW_MATERIAL') {
        this.simpleVariant.patchValue({ durationMinutes: null, stockTrackable: true }, { emitEvent: false });
        this.form.patchValue({ isSellable: false }, { emitEvent: false });
        // Auto-select default unit "Unidad (und)" if no unit is set
        if (!this.simpleVariant.get('baseUnitId')?.value) {
          this.unitsSvc.findAll({ search: 'und', limit: 1, onlyActive: true }).subscribe(res => {
            const unit = res.data.find((u: any) => u.abbreviation === 'und');
            if (unit) {
              this.simpleVariant.patchValue({ baseUnitId: unit.id }, { emitEvent: false });
              this.initialUnitOption.set({ value: unit.id, label: `${unit.name} (${unit.abbreviation})` });
            }
          });
        }
      } else {
        this.simpleVariant.patchValue({ durationMinutes: null, stockTrackable: true }, { emitEvent: false });
        this.form.patchValue({ isSellable: true, isPurchasable: true }, { emitEvent: false });
      }
      this.syncValidators();
    });

    this.comboPriceModeCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncValidators());

    // Force FIXED mode when choice groups exist
    this.comboItems.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.hasChoiceGroups && this.comboPriceModeCtrl.value !== 'FIXED') {
        this.comboPriceModeCtrl.setValue('FIXED', { emitEvent: true });
      }
    });

    this.syncValidators();
  }

  private syncValidators() {
    const type = this.typeCtrl.value;
    const hasVariants = this.hasVariants.value;
    const salePriceCtrl  = this.simpleVariant.get('salePrice')!;
    const baseUnitIdCtrl = this.simpleVariant.get('baseUnitId')!;

    if (hasVariants) {
      this.simpleVariant.disable();
      this.variants.enable();
    } else {
      this.simpleVariant.enable();
      this.variants.disable();

      const needsSalePrice = type !== 'RAW_MATERIAL' &&
        !(type === 'COMBO' && this.comboPriceModeCtrl.value === 'CALCULATED');

      if (needsSalePrice) {
        salePriceCtrl.setValidators([Validators.required, Validators.min(0.01)]);
      } else {
        salePriceCtrl.clearValidators();
      }
      salePriceCtrl.updateValueAndValidity({ emitEvent: false });

      const conversionFactorCtrl = this.simpleVariant.get('conversionFactor')!;
      if (type === 'RAW_MATERIAL') {
        baseUnitIdCtrl.setValidators([Validators.required]);
        conversionFactorCtrl.setValidators([Validators.required, Validators.min(0.0001)]);
      } else {
        baseUnitIdCtrl.clearValidators();
        conversionFactorCtrl.setValidators([Validators.min(0.0001)]);
      }
      baseUnitIdCtrl.updateValueAndValidity({ emitEvent: false });
      conversionFactorCtrl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private variantsHaveData(): boolean {
    return this.variants.controls.some(ctrl => {
      const v = ctrl.value;
      return v.name || v.salePrice || v.sku || v.barcode;
    });
  }

  private applyHasVariantsChange(enabled: boolean) {
    if (enabled) {
      this.syncValidators();
      if (this.basicFieldsValid()) this.step.set(2);
    } else {
      this.variants.clear();
      this.syncValidators();
      this.step.set(1);
    }
  }

  // ── Category attributes ───────────────────────────────────────────────────
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

  // ── COMBO tax (inline, no child component) ────────────────────────────────
  searchComboTaxesFn = (query: string, page: number = 1) =>
    this.taxSvc.findAll({ search: query || undefined, page, limit: 20, filterModel: { isActive: { filterType: 'boolean', type: 'equals', filter: true } } }).pipe(
      map(res => ({
        data: (res.data ?? []).map(t => ({ value: t.id, label: `${t.name} (${t.percentage}%)` } as SearchSelectOption)).reverse(),
        hasMore: (res.data ?? []).length === 20
      }))
    );

  onComboTaxChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (Array.isArray(event)) this.initialTaxOptions.set(event);
    else if (!event) this.initialTaxOptions.set([]);
  }

  // ── Image handling ─────────────────────────────────────────────────────────
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  onImageFileSelected(file: File) {
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.toastSvc.error('Formato de imagen no válido. Usa JPG, PNG, WebP o GIF.');
      return;
    }
    if (file.size > this.MAX_IMAGE_SIZE) {
      this.toastSvc.error('La imagen no debe superar 5 MB.');
      return;
    }
    this.selectedImageFile.set(file);
  }

  onImageRemoved() {
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.imagePublicId.set(null);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  goToVariantStep() {
    this.markBasicAsTouched();
    if (!this.basicFieldsValid()) return;
    this.step.set(2);
  }

  goBack() {
    if (this.step() === 2) {
      this.step.set(1);
      return;
    }
    {
      this.router.navigate(['/inventario/productos']);
    }
  }

  private markBasicAsTouched() {
    ['name', 'categoryId'].forEach(c => this.form.get(c)?.markAsTouched());
  }

  private basicFieldsValid(): boolean {
    return ['name', 'categoryId'].every(c => this.form.get(c)?.valid);
  }

  // ── Variant management ────────────────────────────────────────────────────
  buildVariant(existingAttrValues?: any[], existingVariant?: any): FormGroup {
    const attrsGroup: Record<string, any> = {};
    for (const cat of this.categoryAttributes()) {
      const attrId = cat.attributeTypeId;
      const existing = existingAttrValues?.find((av: any) => av.attributeTypeId === attrId);
      const value = existing
        ? (cat.attributeType.dataType === 'NUMBER' ? existing.valueNumber : existing.valueText) ?? ''
        : '';
      attrsGroup[attrId] = [value, cat.isRequired ? [Validators.required] : []];
    }
    return this.fb.group({
      id: [existingVariant?.id ?? null],
      name: [existingVariant?.name ?? '', Validators.required],
      sku: [existingVariant?.sku ?? ''],
      barcode: [existingVariant?.barcode ?? ''],
      isActive: [existingVariant?.isActive ?? true],
      presentationId: [existingVariant?.presentationId ?? ''],
      baseUnitId: [existingVariant?.baseUnitId ?? '',
        this.typeCtrl.value === 'RAW_MATERIAL' ? [Validators.required] : []],
      conversionFactor: [this.round2(existingVariant?.conversionFactor) ?? 1, [Validators.min(0.0001)]],
      costPrice: [this.round2(existingVariant?.costPrice ?? 0), [Validators.min(0)]],
      salePrice: [this.round2(existingVariant?.salePrice ?? null),
        this.typeCtrl.value === 'RAW_MATERIAL' ? [Validators.min(0)] : [Validators.required, Validators.min(0.01)]],
      stockTrackable: [existingVariant?.stockTrackable ?? (this.typeCtrl.value !== 'SERVICE')],
      trackLots: [existingVariant?.trackLots ?? false],
      trackExpiry: [existingVariant?.trackExpiry ?? false],
      durationMinutes: [existingVariant?.durationMinutes ?? null],
      minimumStock: [existingVariant?.minimumStock ?? null],
      maximumStock: [existingVariant?.maximumStock ?? null],
      taxIds: [existingVariant?.variantTaxes?.map((vt: any) => vt.taxId) ?? []],
      imageUrl: [existingVariant?.imageUrl ?? null],
      imagePublicId: [existingVariant?.imagePublicId ?? null],
      imageFile: [null],
      attributes: this.fb.group(attrsGroup),
      recipe: this.buildRecipeGroup(existingVariant?.recipe),
    }, { validators: this.stockMinMaxValidator });
  }

  private stockMinMaxValidator(group: import('@angular/forms').AbstractControl) {
    const min = group.get('minimumStock')?.value;
    const max = group.get('maximumStock')?.value;
    if (min != null && max != null && Number(max) < Number(min)) {
      return { minExceedsMax: true };
    }
    return null;
  }

  buildRecipeGroup(existing?: any): FormGroup {
    const ingredients = this.fb.array(
      (existing?.ingredients ?? []).map((ing: any) => this.fb.group({
        variantId: [ing.variantId, Validators.required],
        variantName: [ing.variantName ?? ''],
        quantity: [this.round2(ing.quantity), [Validators.required, Validators.min(0.0001)]],
        unitId: [ing.unitId, Validators.required],
        unitName: [ing.unitAbbreviation ?? ''],
        notes: [ing.notes ?? '']
      }))
    );
    return this.fb.group({
      enabled: [!!existing],
      yield: [this.round2(existing?.yield ?? null), [Validators.min(0.0001)]],
      yieldUnitId: [existing?.yieldUnitId ?? ''],
      notes: [existing?.notes ?? ''],
      ingredients
    });
  }

  addVariant() {
    this.draftVariantForm.set(this.buildVariant());
    this.editingVariantIndex.set(null);
    this.isDrawerOpen.set(true);
  }

  removeVariant(i: number) {
    if (this.variants.length <= 1) return;
    const variantId = this.variants.at(i).get('id')?.value;
    if (this.isEditing() && variantId) {
      this.variantDeleteIndex.set(i);
      this.isVariantDeleteModalOpen.set(true);
    } else {
      this.variants.removeAt(i);
    }
  }

  duplicateVariant(index: number) {
    const source = this.variants.at(index).value;
    const clone = this.buildVariant(source.attributes ? Object.entries(source.attributes).map(([k, v]) => ({
      attributeTypeId: k,
      ...(typeof v === 'number' ? { valueNumber: v } : { valueText: v })
    })) : []);
    clone.patchValue({
      ...source,
      id: null,
      name: '',
      sku: '',
      barcode: '',
      imageUrl: null,
      imagePublicId: null,
      imageFile: null,
    });
    this.variants.push(clone);
    this.openEditDrawer(this.variants.length - 1);
  }

  confirmDeleteVariant() {
    const i = this.variantDeleteIndex();
    if (i !== null) this.variants.removeAt(i);
    this.isVariantDeleteModalOpen.set(false);
    this.variantDeleteIndex.set(null);
  }

  cancelDeleteVariant() {
    this.isVariantDeleteModalOpen.set(false);
    this.variantDeleteIndex.set(null);
  }

  openEditDrawer(index: number) {
    this.draftVariantForm.set(this.variants.at(index) as FormGroup);
    this.editingVariantIndex.set(index);
    this.isDrawerOpen.set(true);
  }

  saveDrawerVariant(form: FormGroup) {
    form.markAllAsTouched();
    if (form.invalid) return;

    if (this.isDuplicateVariant(form)) {
      this.toastSvc.error('Ya existe una variante con la misma presentación y atributos');
      return;
    }

    if (this.editingVariantIndex() === null) this.variants.push(form);
    this.closeDrawer();
  }

  private isDuplicateVariant(form: FormGroup): boolean {
    const editingIndex = this.editingVariantIndex();
    const newKey = this.variantKey(form.value);

    return this.variants.controls.some((ctrl, i) => {
      if (i === editingIndex) return false;
      return this.variantKey(ctrl.value) === newKey;
    });
  }

  private variantKey(v: any): string {
    const presentationId = v.presentationId || '';
    const attrs = this.categoryAttributes()
      .map(cat => {
        const val = v.attributes?.[cat.attributeTypeId];
        return `${cat.attributeTypeId}:${val ?? ''}`;
      })
      .sort()
      .join('|');
    return `${presentationId}::${attrs}`;
  }

  handleDrawerClose() {
    if (this.variantDrawer?.hasUnsavedChanges()) {
      this.isVariantExitModalOpen.set(true);
    } else {
      this.closeDrawer();
    }
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.editingVariantIndex.set(null);
    this.draftVariantForm.set(null);
  }

  confirmClearVariants() {
    this.isVariantClearModalOpen.set(false);
    this.hasVariants.setValue(false, { emitEvent: false });
    this.applyHasVariantsChange(false);
  }

  cancelClearVariants() {
    this.isVariantClearModalOpen.set(false);
  }

  confirmExitVariant() {
    this.isVariantExitModalOpen.set(false);
    this.closeDrawer();
  }

  cancelExitVariant() {
    this.isVariantExitModalOpen.set(false);
  }

  // ── Search helpers ─────────────────────────────────────────────────────────
  // (Movidos a los componentes hijos: product-general-info, physical-variant-form,
  //  service-variant-form, raw-material-form)

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit() {
    this.form.markAllAsTouched();
    if (!this.basicFieldsValid()) {
      this.step.set(1);
      return;
    }

    const val = this.form.value;

    if (val.hasVariants) {
      if (this.variants.length === 0) {
        this.toastSvc.error(`Agrega al menos una ${this.variantNoun}`);
        return;
      }
      if (this.variants.invalid) return;
    } else {
      if (this.simpleVariant.invalid) return;
      if ((val.type === 'PHYSICAL' || val.type === 'SERVICE') && this.modifierGroups.invalid) return;
    }

    if (val.type === 'COMBO') {
      if (this.comboItems.length < 2) {
        this.toastSvc.error('Un combo debe tener al menos 2 componentes');
        return;
      }
      // Validar choice groups: nombre requerido + mínimo 2 opciones
      for (let i = 0; i < this.comboItems.length; i++) {
        const ctrl = this.comboItems.at(i);
        const cg = ctrl.get('choiceGroup');
        if (cg) {
          if (!cg.get('name')?.value?.trim()) {
            this.toastSvc.error(`El grupo de elección #${i + 1} necesita un nombre`);
            return;
          }
          const options = (cg.get('options') as FormArray);
          if (options.length < 2) {
            this.toastSvc.error(`El grupo "${cg.get('name')?.value}" necesita al menos 2 opciones`);
            return;
          }
        }
      }
    }

    this.isSubmitting.set(true);
    this.uploadProgressLabel.set('Guardando...');

    // Build JSON payload
    const payload: CreateProductPayload = {
      name: val.name,
      description: val.description || undefined,
      type: val.type,
      comboPriceMode: val.type === 'COMBO' ? val.comboPriceMode : undefined,
      categoryId: val.categoryId,
      brandId: val.brandId || undefined,
      isActive: val.isActive,
      isSellable: val.isSellable,
      isPurchasable: val.isPurchasable,
      // Preserve existing image URL if no new file selected
      imageUrl: (() => {
        const preview = this.imagePreviewUrl();
        return !this.selectedImageFile() && preview && !preview.startsWith('data:') ? preview : undefined;
      })(),
      imagePublicId: !this.selectedImageFile() ? (this.imagePublicId() ?? undefined) : undefined,
      variants: val.hasVariants
        ? this.variants.controls.map(ctrl => this.mapVariant(ctrl.value))
        : [this.mapSimpleVariant(val.simpleVariant, val.name, val.type)],
      comboItems: val.type === 'COMBO' && this.comboItems.length > 0
        ? this.comboItems.controls.map(c => {
            const choiceGroupCtrl = c.get('choiceGroup');
            if (choiceGroupCtrl) {
              const cg = choiceGroupCtrl.value;
              return {
                quantity: Number(c.get('quantity')?.value),
                choiceGroup: {
                  name: cg.name,
                  minSelections: cg.minSelections ?? 1,
                  maxSelections: cg.maxSelections ?? 1,
                  required: cg.required ?? true,
                  sortOrder: cg.sortOrder ?? 0,
                  options: (cg.options ?? []).map((o: any) => ({
                    variantId: o.variantId,
                    name: o.name,
                    priceAdjustment: Number(o.priceAdjustment) || 0,
                    isDefault: o.isDefault ?? false,
                    sortOrder: o.sortOrder ?? 0,
                  })),
                },
              };
            }
            return {
              variantId: c.get('productVariantId')?.value,
              quantity: Number(c.get('quantity')?.value),
              modifierGroups: this.mapItemModifiers(c.get('modifierGroups') as FormArray),
            };
          })
        : undefined,
      modifierGroups: (val.type === 'PHYSICAL' || val.type === 'SERVICE')
        ? this.modifierGroups.controls.map(g => ({
            id: g.get('id')?.value || undefined,
            name: g.get('name')?.value,
            minSelections: g.get('minSelections')?.value ?? 0,
            maxSelections: g.get('maxSelections')?.value ?? undefined,
            required: g.get('required')?.value ?? false,
            sortOrder: g.get('sortOrder')?.value ?? 0,
            options: (g.get('options') as FormArray).controls.map((o, oi) => ({
              id: o.get('id')?.value || undefined,
              name: o.get('name')?.value,
              priceAdjustment: Number(o.get('priceAdjustment')?.value) || 0,
              variantId: o.get('variantId')?.value || undefined,
              isDefault: o.get('isDefault')?.value ?? false,
              sortOrder: o.get('sortOrder')?.value ?? oi
            }))
          }))
        : undefined
    };

    // Build FormData: JSON + files
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));

    if (this.selectedImageFile()) {
      formData.append('productImage', this.selectedImageFile()!);
    }

    if (val.hasVariants) {
      this.variants.controls.forEach((ctrl, i) => {
        const file = ctrl.get('imageFile')?.value as File | null;
        if (file) formData.append(`variantImage_${i}`, file);
      });
    }

    const obs$ = this.isEditing()
      ? this.productSvc.update(this.productId()!, formData)
      : this.productSvc.create(formData);

    obs$.subscribe({
      next: res => {
        this.savedSuccessfully = true;
        const msg = this.isEditing() ? 'Producto actualizado' : `Producto "${res.name}" creado`;
        this.toastSvc.success(`${msg} exitosamente`);
        this.router.navigate(['/inventario/productos']);
      },
      error: () => {
        this.toastSvc.error('Error al guardar el producto');
        this.isSubmitting.set(false);
        this.uploadProgressLabel.set(null);
      }
    });
  }

  private mapSimpleVariant(sv: any, productName: string, type: string) {
    const attributeValues = this.buildAttributeValues(sv.attributes ?? {});
    let salePrice: number;
    if (type === 'RAW_MATERIAL') {
      salePrice = 0; // backend enforces salePrice = 0 for RAW_MATERIAL
    } else if (type === 'COMBO' && this.comboPriceModeCtrl.value === 'CALCULATED') {
      salePrice = 0; // CALCULATED combos get price at POS
    } else {
      salePrice = Number(sv.salePrice);
    }
    return {
      id: sv.id || undefined,
      name: productName,
      sku: sv.sku || undefined,
      barcode: sv.barcode || undefined,
      presentationId: (type === 'PHYSICAL' || type === 'RAW_MATERIAL') ? (sv.presentationId || undefined) : undefined,
      baseUnitId: sv.baseUnitId || undefined,
      conversionFactor: sv.conversionFactor ? Number(sv.conversionFactor) : undefined,
      costPrice: Number(sv.costPrice),
      salePrice,
      taxIds: sv.taxIds?.length ? sv.taxIds : undefined,
      stockTrackable: type === 'SERVICE' || type === 'COMBO' ? false : (sv.stockTrackable ?? true),
      trackLots: (type !== 'SERVICE' && type !== 'COMBO') && sv.stockTrackable ? (sv.trackLots ?? false) : false,
      trackExpiry: (type !== 'SERVICE' && type !== 'COMBO') && sv.stockTrackable ? (sv.trackExpiry ?? false) : false,
      durationMinutes: type === 'SERVICE' && sv.durationMinutes ? Number(sv.durationMinutes) : undefined,
      minimumStock: (type === 'PHYSICAL' || type === 'RAW_MATERIAL') && sv.stockTrackable && sv.minimumStock != null ? Number(sv.minimumStock) : undefined,
      maximumStock: (type === 'PHYSICAL' || type === 'RAW_MATERIAL') && sv.stockTrackable && sv.maximumStock != null ? Number(sv.maximumStock) : undefined,
      attributeValues: attributeValues.length ? attributeValues : undefined,
      recipe: this.buildRecipePayload(sv.recipe),
    };
  }

  private mapVariant(v: any) {
    const attributeValues = this.buildAttributeValues(v.attributes);
    const type = this.typeCtrl.value;
    const salePrice = type === 'RAW_MATERIAL' ? 0 : Number(v.salePrice);
    const stockTrackable = type === 'SERVICE' ? false : (v.stockTrackable ?? true);
    return {
      id: v.id || undefined,
      isActive: v.isActive ?? true,
      name: v.name,
      sku: v.sku || undefined,
      barcode: v.barcode || undefined,
      presentationId: v.presentationId || undefined,
      baseUnitId: v.baseUnitId || undefined,
      conversionFactor: v.conversionFactor ? Number(v.conversionFactor) : undefined,
      costPrice: Number(v.costPrice),
      salePrice,
      taxIds: v.taxIds?.length ? v.taxIds : undefined,
      stockTrackable,
      trackLots: stockTrackable ? (v.trackLots ?? false) : false,
      trackExpiry: stockTrackable ? (v.trackExpiry ?? false) : false,
      durationMinutes: type === 'SERVICE' && v.durationMinutes ? Number(v.durationMinutes) : undefined,
      minimumStock: (v.stockTrackable && v.minimumStock != null) ? Number(v.minimumStock) : undefined,
      maximumStock: (v.stockTrackable && v.maximumStock != null) ? Number(v.maximumStock) : undefined,
      imageUrl: v.imageUrl || undefined,
      imagePublicId: v.imagePublicId || undefined,
      attributeValues: attributeValues.length ? attributeValues : undefined,
      recipe: this.buildRecipePayload(v.recipe),
    };
  }

  private mapItemModifiers(arr: FormArray | null | undefined) {
    if (!arr?.length) return undefined;
    return arr.controls.map(g => ({
      name: g.get('name')?.value,
      minSelections: g.get('minSelections')?.value ?? 0,
      maxSelections: g.get('maxSelections')?.value ?? undefined,
      required: g.get('required')?.value ?? false,
      sortOrder: g.get('sortOrder')?.value ?? 0,
      options: (g.get('options') as FormArray).controls.map((o, oi) => ({
        name: o.get('name')?.value,
        priceAdjustment: Number(o.get('priceAdjustment')?.value) || 0,
        variantId: o.get('variantId')?.value || undefined,
        isDefault: o.get('isDefault')?.value ?? false,
        sortOrder: o.get('sortOrder')?.value ?? oi
      }))
    }));
  }

  private buildRecipePayload(recipe: any) {
    if (!recipe?.enabled || !recipe?.ingredients?.length) return undefined;
    if (!recipe?.yieldUnitId) return undefined;
    return {
      yield: Number(recipe.yield),
      yieldUnitId: recipe.yieldUnitId,
      notes: recipe.notes || undefined,
      ingredients: recipe.ingredients
        .filter((ing: any) => ing.variantId && ing.unitId)
        .map((ing: any) => ({
          variantId: ing.variantId,
          quantity: Number(ing.quantity),
          unitId: ing.unitId,
          notes: ing.notes || undefined,
        })),
    };
  }

  private round2(value: number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    return Math.round(value * 100) / 100;
  }

  private buildAttributeValues(attrs: Record<string, any> = {}) {
    return this.categoryAttributes()
      .map(cat => {
        const value = attrs[cat.attributeTypeId];
        if (value === null || value === undefined || value === '') return null;
        return {
          attributeTypeId: cat.attributeTypeId,
          valueText: cat.attributeType.dataType !== 'NUMBER' ? String(value) : undefined,
          valueNumber: cat.attributeType.dataType === 'NUMBER' ? Number(value) : undefined,
        };
      })
      .filter(Boolean) as any[];
  }
}
