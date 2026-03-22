import {
  Component, ChangeDetectionStrategy, inject, signal, input, output, effect
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlContainer, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTag, lucideFolder, lucideAlertCircle, lucideInfo, lucidePackage
} from '@ng-icons/lucide';
import { map } from 'rxjs';

import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { ToggleSwitchComponent } from '../../../../shared/components/ui/toggle-switch/toggle-switch';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { ProductTypeSelectorComponent } from '../product-type-selector/product-type-selector';
import { AttributeConfiguratorComponent } from '../attribute-configurator/attribute-configurator.component';
import { CategoryDrawerComponent } from '../category-drawer/category-drawer.component';
import { BrandDrawerComponent } from '../brand-drawer/brand-drawer.component';
import { CategoryService } from '../../../../core/services/category.service';
import { BrandService } from '../../../../core/services/brand.service';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { CategoryAttributeType } from '../../models/product.model';
import { Category } from '../../../../core/models/category.models';
import { Brand } from '../../../../core/models/brand.models';

@Component({
  selector: 'app-product-general-info',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, NgIconComponent,
    SearchSelectComponent, ToggleSwitchComponent, FieldInputComponent,
    CategoryDrawerComponent, BrandDrawerComponent,
    ProductTypeSelectorComponent, AttributeConfiguratorComponent
  ],
  providers: [
    provideIcons({ lucideTag, lucideFolder, lucideAlertCircle, lucideInfo, lucidePackage })
  ],
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  templateUrl: './product-general-info.component.html',
})
export class ProductGeneralInfoComponent {
  private categorySvc = inject(CategoryService);
  private brandSvc    = inject(BrandService);
  private fg = inject(ControlContainer).control as FormGroup;

  // ── Signal inputs ────────────────────────────────────────────────────────
  typePreset              = input(false);
  isEditing               = input(false);
  showBrand               = input(false);
  showSellable            = input(true);
  showPurchasable         = input(true);
  initialCategoryOption   = input<SearchSelectOption | undefined>(undefined);
  initialBrandOption      = input<SearchSelectOption | undefined>(undefined);
  initialCategoryAttributes = input<CategoryAttributeType[]>([]);

  // ── Signal outputs ───────────────────────────────────────────────────────
  categoryOptionChange  = output<SearchSelectOption | undefined>();
  brandOptionChange     = output<SearchSelectOption | undefined>();
  attributesChange      = output<CategoryAttributeType[]>();

  // ── Reactive form values (for OnPush template conditions) ────────────────
  categoryIdValue = toSignal(
    this.fg.get('categoryId')!.valueChanges,
    { initialValue: this.fg.get('categoryId')?.value ?? '' }
  );
  isActiveValue = toSignal(
    this.fg.get('isActive')!.valueChanges,
    { initialValue: this.fg.get('isActive')?.value ?? true }
  );
  // ── Quick-create drawers ──────────────────────────────────────────────────
  catCreateOpen   = signal(false);
  brandCreateOpen = signal(false);

  // ── Internal option tracking ─────────────────────────────────────────────
  _catOption   = signal<SearchSelectOption | undefined>(undefined);
  _brandOption = signal<SearchSelectOption | undefined>(undefined);

  constructor() {
    effect(() => { const o = this.initialCategoryOption(); if (o) this._catOption.set(o); });
    effect(() => { const o = this.initialBrandOption();    if (o) this._brandOption.set(o); });
  }

  // ── Getters for error state (used in template) ───────────────────────────
  get nameCtrl()     { return this.fg.get('name'); }
  get categoryCtrl() { return this.fg.get('categoryId'); }

  // ── Event handlers ───────────────────────────────────────────────────────
  onCatChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    const opt = Array.isArray(event) ? undefined : (event ?? undefined);
    this._catOption.set(opt);
    this.categoryOptionChange.emit(opt);
  }

  onBrandChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    const opt = Array.isArray(event) ? undefined : (event ?? undefined);
    this._brandOption.set(opt);
    this.brandOptionChange.emit(opt);
  }

  onAttributesChange(attrs: CategoryAttributeType[]) {
    this.attributesChange.emit(attrs);
  }

  onOpenCategoryCreate() { this.catCreateOpen.set(true); }

  onCategoryCreated(cat: Category) {
    const opt: SearchSelectOption = { label: cat.name, value: cat.id, icon: 'lucideFolder' };
    this.fg.get('categoryId')!.setValue(cat.id);
    this._catOption.set(opt);
    this.categoryOptionChange.emit(opt);
    this.catCreateOpen.set(false);
  }

  onOpenBrandCreate() { this.brandCreateOpen.set(true); }

  onBrandCreated(brand: Brand) {
    const opt: SearchSelectOption = { label: brand.name, value: brand.id };
    this.fg.get('brandId')!.setValue(brand.id);
    this._brandOption.set(opt);
    this.brandOptionChange.emit(opt);
    this.brandCreateOpen.set(false);
  }

  // ── Search functions (inyectan el servicio directamente) ─────────────────
  searchCategoriesFn = (query: string, page: number) =>
    this.categorySvc.findAll({
      search: query, page, limit: 8,
      filterModel: { status: { filterType: 'text', type: 'equals', filter: 'ACTIVE' } }
    }).pipe(
      map(res => ({
        data: res.data.map((c: any) => ({ label: c.name, value: c.id, icon: 'lucideFolder' } as SearchSelectOption)),
        hasMore: res.data.length === 8
      }))
    );

  searchBrandsFn = (query: string, page: number) =>
    this.brandSvc.findAll({ search: query, page, limit: 8 }).pipe(
      map((res: any) => {
        const items = Array.isArray(res) ? res : (res.data ?? []);
        return {
          data: items.map((b: any) => ({ label: b.name, value: b.id } as SearchSelectOption)),
          hasMore: items.length === 8
        };
      })
    );
}
