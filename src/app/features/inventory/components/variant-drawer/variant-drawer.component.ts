import { Component, Input, Output, EventEmitter, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideX, lucidePackage, lucideHash, lucideDollarSign,
  lucideInfo, lucideCheck, lucideLayers, lucideAlertCircle,
  lucideBoxes, lucideBox, lucideChevronDown,
  lucideBarcode, lucideWrench, lucideTag, lucideZap, lucideClock,
  lucideSliders, lucideImage
} from '@ng-icons/lucide';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { BarcodeFieldComponent } from '../../../../shared/components/ui/barcode-field/barcode-field.component';
import { RecipeBuilderComponent } from '../recipe-builder/recipe-builder.component';
import { UnitDrawerComponent } from '../unit-drawer/unit-drawer.component';
import { PresentationService } from '../../../../core/services/presentation.service';
import { TaxService } from '../../../../core/services/tax.service';
import { UnitsService } from '../../../../core/services/units.service';
import { Unit } from '../../../../core/models/unit.models';
import { CategoryAttributeType } from '../../models/product.model';
import { ToggleSwitchComponent } from '../../../../shared/components/ui/toggle-switch/toggle-switch';
import { StockTrackingConfigComponent } from '../stock-tracking-config/stock-tracking-config';
import { map } from 'rxjs';

@Component({
  selector: 'app-variant-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, SearchSelectComponent, FormButtonComponent, BarcodeFieldComponent, RecipeBuilderComponent, UnitDrawerComponent, ToggleSwitchComponent, StockTrackingConfigComponent],
  providers: [
    provideIcons({
      lucideX, lucidePackage, lucideHash, lucideDollarSign,
      lucideInfo, lucideCheck, lucideLayers, lucideAlertCircle,
      lucideBoxes, lucideBox, lucideChevronDown,
      lucideBarcode, lucideWrench, lucideTag, lucideZap, lucideClock,
      lucideSliders, lucideImage
    })
  ],
  template: `
    <div class="drawer-overlay" (click)="cancel()">
      <div class="drawer-content" (click)="$event.stopPropagation()" [formGroup]="form">

        <!-- HEADER -->
        <header class="drawer-header">
          <div class="header-main">
            <div class="header-icon">
              <ng-icon [name]="isService ? 'lucideWrench' : 'lucidePackage'"></ng-icon>
            </div>
            <div class="header-text">
              <h3>{{ form.get('name')?.value || 'Nueva Variante' }}</h3>
              <p>{{ productName || (isService ? 'Servicio' : isRawMaterial ? 'Materia Prima' : 'Producto Físico') }} · {{ isNew ? 'Nueva variante' : 'Variante #' + (index + 1) }}</p>
            </div>
          </div>
          <button type="button" class="btn-close" (click)="cancel()">
            <ng-icon name="lucideX"></ng-icon>
          </button>
        </header>

        <!-- BODY -->
        <div class="drawer-body">

          <!-- Section: Identity -->
          <div class="section-card">
            <div class="section-kicker"><ng-icon name="lucideTag"></ng-icon> Identidad</div>
            <div class="form-stack">
              <div class="field" [class.error]="form.get('name')?.invalid && form.get('name')?.touched">
                <label>Nombre de Variante *</label>
                <input type="text" formControlName="name" placeholder="Ej: Rojo / XL, 750ml..." autofocus>
                @if (form.get('name')?.invalid && form.get('name')?.touched) {
                  <small class="err-msg"><ng-icon name="lucideAlertCircle"></ng-icon> Requerido.</small>
                }
              </div>

              <div class="field">
                <label>SKU Interno</label>
                <div class="input-icon-wrap">
                  <ng-icon name="lucideHash" class="ic"></ng-icon>
                  <input type="text" formControlName="sku" placeholder="Ej: CAM-ROJO-XL, BEB-001">
                </div>
              </div>

              @if (!isService) {
                <div class="field">
                  <label>Código de Barras</label>
                  <app-barcode-field
                    formControlName="barcode"
                    [productName]="form.get('name')?.value"
                    [salePrice]="form.get('salePrice')?.value">
                  </app-barcode-field>
                </div>

                <div class="field">
                  <label>Presentación</label>
                  <app-search-select
                    formControlName="presentationId"
                    placeholder="Ej: Botella Vidrio"
                    [searchFn]="searchPresentationsFn.bind(this)"
                    [initialOption]="initialPresentationOption()"
                    (selectionChange)="onPresentationChange($event)"
                  ></app-search-select>
                </div>
              }

              @if (isService) {
                <div class="field">
                  <label>Duración</label>
                  <div class="duration-picker">
                    <div class="duration-presets">
                      @for (preset of durationPresets; track preset) {
                        <button type="button" class="duration-chip"
                          [class.selected]="form.get('durationMinutes')?.value === preset"
                          (click)="form.get('durationMinutes')?.setValue(preset)">
                          {{ durationLabel(preset) }}
                        </button>
                      }
                    </div>
                    <div class="duration-custom">
                      <ng-icon name="lucideClock"></ng-icon>
                      <input type="number" formControlName="durationMinutes" min="1" placeholder="Otro (min)">
                    </div>
                  </div>
                </div>
              }

              <!-- Variante activa -->
              <div class="pff__toggle-row" (click)="isActiveToggle.toggle()">
                <div class="pff__toggle-info">
                  <span class="pff__toggle-label">Variante activa</span>
                  <small class="pff__toggle-hint">Las variantes inactivas no aparecen en el punto de venta</small>
                </div>
                <app-toggle-switch #isActiveToggle formControlName="isActive" size="sm" (click)="$event.stopPropagation()"></app-toggle-switch>
              </div>

              <!-- Imagen de variante -->
              <div class="field">
                <label>Imagen <span class="optional">Opcional — sobreescribe la del producto</span></label>
                <label class="variant-image-drop" for="variant-img-{{index}}">
                  @if (imagePreview()) {
                    <img [src]="imagePreview()" alt="Preview" class="variant-img-preview">
                    <span class="variant-img-overlay">Cambiar</span>
                  } @else {
                    <div class="variant-img-placeholder">
                      <ng-icon name="lucideImage"></ng-icon>
                      <span>Subir imagen</span>
                    </div>
                  }
                </label>
                <input [id]="'variant-img-' + index" type="file" accept="image/*" hidden
                  (change)="onImageSelected($event)">
              </div>
            </div>
          </div>

          <!-- Section: Base Unit -->
          <div class="section-card">
            <div class="section-kicker"><ng-icon name="lucideLayers"></ng-icon> Unidad de Medida <span class="section-optional">Opcional</span></div>
            <div class="form-stack">
              <div class="field">
                <label>Unidad Base <span class="optional">Ej: kg, lt, und</span></label>
                <app-search-select
                  formControlName="baseUnitId"
                  placeholder="Buscar unidad..."
                  [searchFn]="searchUnitsFn.bind(this)"
                  [initialOption]="initialUnitOption()"
                  createNewLabel="Crear nueva unidad"
                  (selectionChange)="onUnitChange($event)"
                  (createNew)="unitCreateOpen.set(true)"
                ></app-search-select>
              </div>
              <div class="field">
                <label>Factor de Conversión <span class="optional">Unidades por paquete base</span></label>
                <input type="number" formControlName="conversionFactor" min="0.0001" step="0.001" placeholder="Ej: 1, 10, 0.5">
                <small class="field-hint">Entero para unidades contables (UNIT), decimal para peso o volumen.</small>
              </div>
            </div>
          </div>

          <!-- Section: Dynamic Attributes -->
          @if (categoryAttributes.length > 0) {
            <div class="section-card" formGroupName="attributes">
              <div class="section-kicker"><ng-icon name="lucideSliders"></ng-icon> Atributos</div>
              <div class="form-stack">
                @for (cat of categoryAttributes; track cat.attributeTypeId) {
                  <div
                    class="field"
                    [class.error]="form.get('attributes')?.get(cat.attributeTypeId)?.invalid && form.get('attributes')?.get(cat.attributeTypeId)?.touched"
                  >
                    <label>
                      {{ cat.attributeType.name }}
                      @if (cat.attributeType.unit) { <span class="unit-hint">({{ cat.attributeType.unit }})</span> }
                      @if (cat.isRequired) { <span class="required-dot">*</span> }
                    </label>

                    @if (cat.attributeType.dataType === 'NUMBER') {
                      <input
                        type="number"
                        [formControlName]="cat.attributeTypeId"
                        [placeholder]="cat.attributeType.unit ? 'Ej: 750' : ''"
                      >
                    } @else if (cat.attributeType.dataType === 'COLOR') {
                      <div class="color-field">
                        <input type="color" [formControlName]="cat.attributeTypeId" class="color-input">
                        <input
                          type="text"
                          [formControlName]="cat.attributeTypeId"
                          placeholder="#000000 o nombre"
                          class="color-text"
                        >
                      </div>
                    } @else if (cat.attributeType.dataType === 'BOOLEAN') {
                      <label class="toggle-row">
                        <input type="checkbox" [formControlName]="cat.attributeTypeId">
                        <span>Sí</span>
                      </label>
                    } @else {
                      <input
                        type="text"
                        [formControlName]="cat.attributeTypeId"
                        [placeholder]="'Ej: ' + cat.attributeType.name"
                      >
                    }

                    @if (form.get('attributes')?.get(cat.attributeTypeId)?.invalid && form.get('attributes')?.get(cat.attributeTypeId)?.touched) {
                      <small class="err-msg"><ng-icon name="lucideAlertCircle"></ng-icon> Requerido.</small>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Section: Tracking -->
          @if (!isService) {
            <div class="section-card">
              <div class="section-kicker"><ng-icon name="lucideBoxes"></ng-icon> Trazabilidad</div>
              <app-stock-tracking-config></app-stock-tracking-config>
            </div>
          }

          <!-- Section: Pricing -->
          <div class="section-card">
            <div class="section-kicker">
              <ng-icon name="lucideDollarSign"></ng-icon> Precios
              @if (!isRawMaterial && margin() !== null) {
                <span class="margin-badge" [class.margin--good]="margin()! >= 20" [class.margin--warn]="margin()! > 0 && margin()! < 20" [class.margin--loss]="margin()! <= 0">
                  {{ margin()! <= 0 ? 'Pérdida' : 'Margen ' + (margin()! | number:'1.0-1') + '%' }}
                </span>
              }
            </div>

            <div class="pfc__pricing-row">
              @if (!isRawMaterial) {
                <div class="pff" [class.pff--error]="form.get('salePrice')?.invalid && form.get('salePrice')?.touched">
                  <label class="pff__label">Precio de Venta <span class="pff__req">*</span></label>
                  <div class="pff__price-wrap">
                    <span class="pff__currency">$</span>
                    <input class="pff__price-input" type="number" formControlName="salePrice" step="0.01" placeholder="0.00">
                  </div>
                  @if (form.get('salePrice')?.invalid && form.get('salePrice')?.touched) {
                    <small class="pff__error"><ng-icon name="lucideAlertCircle"></ng-icon> Precio de venta requerido.</small>
                  }
                </div>
              }
              <div class="pff">
                <label class="pff__label">Costo Neto <span class="pff__optional">Opcional</span></label>
                <div class="pff__price-wrap">
                  <span class="pff__currency">$</span>
                  <input class="pff__price-input" type="number" formControlName="costPrice" step="0.01" placeholder="0.00">
                </div>
              </div>
            </div>

            <div class="field">
              <label>Impuestos Aplicables</label>
              <app-search-select
                formControlName="taxIds"
                placeholder="Añadir IVA, ICE..."
                [multiple]="true"
                [searchFn]="searchTaxesFn.bind(this)"
                [initialOptions]="initialTaxOptions()"
                (selectionChange)="onTaxSelectionChange($event)"
              ></app-search-select>
            </div>
          </div>

          <!-- Section: Recipe -->
          @if (!isService) {
            <div class="section-card">
              <div class="section-kicker">
                <ng-icon name="lucideZap"></ng-icon> Receta
                <span class="section-optional">Opcional</span>
              </div>
              @if (form.get('recipe')) {
                <app-recipe-builder [recipeGroup]="$any(form.get('recipe'))"></app-recipe-builder>
              }
            </div>
          }

        </div>

        <!-- FOOTER -->
        <footer class="drawer-footer">
          <app-form-button
            label="Cancelar"
            variant="ghost"
            [disabled]="false"
            [fullWidth]="true"
            [type]="'button'"
            (click)="cancel()"
          ></app-form-button>
          <app-form-button
            [label]="isNew ? 'Añadir variante' : 'Guardar variante'"
            loadingLabel="Guardando..."
            icon="lucideCheck"
            [loading]="false"
            [disabled]="form.invalid"
            [fullWidth]="true"
            [type]="'button'"
            (click)="save()"
          ></app-form-button>
        </footer>

      </div>
    </div>

    <app-unit-drawer
      [isOpen]="unitCreateOpen()"
      (saved)="onUnitCreated($event)"
      (close)="unitCreateOpen.set(false)"
    ></app-unit-drawer>
  `,
  styles: [`
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      animation: fadeIn 0.3s ease;
    }

    .drawer-content {
      width: 100%;
      max-width: 560px;
      height: 100%;
      background: var(--color-bg-surface);
      display: flex;
      flex-direction: column;
      box-shadow: -10px 0 40px rgba(0,0,0,0.15);
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .drawer-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--color-border-light);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      .header-main {
        display: flex;
        gap: 1rem;

        .header-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          background: var(--color-bg-canvas);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: var(--color-accent-primary);
          border: 1px solid var(--color-border-subtle);
        }

        .header-text {
          h3 { margin: 0; font-size: 1.125rem; font-weight: 700; color: var(--color-text-main); }
          p  { margin: 4px 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 500; }
        }
      }

      .btn-close {
        background: transparent;
        border: 1px solid var(--color-border-light);
        color: var(--color-text-muted);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all var(--transition-fast);
        &:hover { background: var(--color-bg-hover); color: var(--color-text-main); }
      }
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-kicker {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--color-border-subtle);

      ng-icon { font-size: 13px; }
    }

    .section-optional {
      margin-left: 4px;
      font-size: 9px;
      font-weight: var(--font-weight-regular);
      text-transform: none;
      letter-spacing: 0;
      color: var(--color-text-muted);
      opacity: 0.7;
    }

    .margin-badge {
      margin-left: auto;
      font-size: 11px;
      font-weight: var(--font-weight-semibold);
      padding: 1px 7px;
      border-radius: 999px;
      text-transform: none;
      letter-spacing: 0;
      &.margin--good { background: var(--color-success-bg); color: var(--color-success-text); }
      &.margin--warn { background: rgba(251, 191, 36, 0.12); color: #D97706; }
      &.margin--loss { background: var(--color-danger-bg); color: var(--color-danger-text); }
    }

    .form-stack { display: flex; flex-direction: column; gap: 1.25rem; }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-main);
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
      }
      input {
        width: 100%;
        height: 40px;
        padding: 0 12px;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        color: var(--color-text-main);
        font-family: inherit;
        outline: none;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        &::placeholder { color: var(--color-text-muted); }
        &:focus { border-color: var(--color-accent-primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08); }
      }
      &.error input { border-color: var(--color-danger-text); &:focus { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08); } }
      .err-msg { font-size: var(--font-size-xs); color: var(--color-danger-text); display: flex; align-items: center; gap: 4px; }
    }

    .unit-hint { font-weight: var(--font-weight-regular); }
    .optional { font-weight: var(--font-weight-regular); color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .field-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .stock-limits { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .required-dot { color: var(--color-danger-text); }

    .color-field {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      .color-input { width: 48px; height: 38px; padding: 2px; border-radius: var(--radius-md); cursor: pointer; }
      .color-text { flex: 1; }
    }

    .toggle-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
    }

    .duration-picker {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .duration-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .duration-chip {
      padding: 0.375rem 0.875rem;
      border-radius: 999px;
      border: 1px solid var(--color-border-light);
      background: var(--color-bg-surface);
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s;
      &:hover { border-color: var(--color-accent-primary); color: var(--color-accent-primary); }
      &.selected {
        background: var(--color-accent-primary);
        border-color: var(--color-accent-primary);
        color: var(--color-bg-canvas);
      }
    }

    .duration-custom {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 0.75rem;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      background: var(--color-bg-canvas);
      color: var(--color-text-muted);
      font-size: 0.875rem;
      input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 0.5rem 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-main);
        outline: none;
        &::placeholder { color: var(--color-text-muted); }
        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button { -webkit-appearance: none; }
      }
    }



    .input-icon-wrap {
      position: relative;
      .ic { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); font-size: 0.875rem; }
      input { padding-left: 2.25rem !important; }
    }

    .drawer-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--color-border-light);
      background: var(--color-bg-surface);
      display: flex;
      gap: 1rem;
      app-form-button { flex: 1; }
    }

    .variant-image-drop {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100px;
      border: 1.5px dashed var(--color-border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      overflow: hidden;
      position: relative;
      transition: border-color 0.2s;

      &:hover { border-color: var(--color-accent-primary); }

      .variant-img-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        color: var(--color-text-muted);
        font-size: 12px;
        ng-icon { font-size: 20px; }
      }

      .variant-img-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .variant-img-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.45);
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
      }

      &:hover .variant-img-overlay { opacity: 1; }
    }
  `]
})
export class VariantDrawerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input() index: number = 0;
  @Input() isNew: boolean = false;
  @Input() isService: boolean = false;
  @Input() isRawMaterial: boolean = false;
  @Input() productName: string = '';
  @Input() categoryAttributes: CategoryAttributeType[] = [];
  @Output() saved = new EventEmitter<FormGroup>();
  @Output() cancelled = new EventEmitter<void>();

  private presentationService = inject(PresentationService);
  private taxService = inject(TaxService);
  private unitsService = inject(UnitsService);

  readonly durationPresets = [15, 30, 45, 60, 90, 120];

  durationLabel(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  initialPresentationOption = signal<SearchSelectOption | undefined>(undefined);
  initialUnitOption = signal<SearchSelectOption | undefined>(undefined);
  initialTaxOptions = signal<SearchSelectOption[]>([]);
  margin = signal<number | null>(null);
  imagePreview = signal<string | null>(null);
  unitCreateOpen = signal(false);

  private priceSub?: Subscription;

  ngOnInit() {
    this.loadInitialOptions();
    this.updateMargin();
    this.priceSub = this.form.valueChanges.subscribe(() => this.updateMargin());
    const existingImage = this.form.get('imageUrl')?.value;
    if (existingImage) this.imagePreview.set(existingImage);
  }

  ngOnDestroy() {
    this.priceSub?.unsubscribe();
  }

  private updateMargin() {
    const sale = Number(this.form.get('salePrice')?.value) || 0;
    const cost = Number(this.form.get('costPrice')?.value) || 0;
    this.margin.set(sale > 0 ? ((sale - cost) / sale) * 100 : null);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form);
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.form.patchValue({ imageFile: file });
    const reader = new FileReader();
    reader.onload = e => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  cancel() {
    this.cancelled.emit();
  }

  public hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  private loadInitialOptions() {
    const baseUnitId = this.form.get('baseUnitId')?.value;
    if (baseUnitId) {
      this.unitsService.findAll({ onlyActive: false }).subscribe(res => {
        const u = res.data.find((x: any) => x.id === baseUnitId);
        if (u) this.initialUnitOption.set({ value: u.id, label: `${u.name} (${u.abbreviation})` });
      });
    }

    const presentationId = this.form.get('presentationId')?.value;
    if (presentationId) {
      this.presentationService.findAll({}).subscribe(res => {
        const p = res.data.find((x: any) => x.id === presentationId);
        if (p) this.initialPresentationOption.set({ value: p.id, label: p.name });
      });
    }

    const taxIds = this.form.get('taxIds')?.value as string[];
    if (taxIds?.length) {
      this.taxService.findAllSimple().subscribe(taxes => {
        const matched = taxes.filter(t => taxIds.includes(t.id));
        this.initialTaxOptions.set(matched.map(m => ({ value: m.id, label: `${m.name} (${m.percentage}%)` })));
      });
    }
  }

  onUnitChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (!Array.isArray(event)) this.initialUnitOption.set(event ?? undefined);
  }

  onUnitCreated(unit: Unit) {
    const opt: SearchSelectOption = { value: unit.id, label: `${unit.name} (${unit.abbreviation})` };
    this.form.patchValue({ baseUnitId: unit.id });
    this.initialUnitOption.set(opt);
    this.unitCreateOpen.set(false);
  }

  onPresentationChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (!Array.isArray(event)) this.initialPresentationOption.set(event ?? undefined);
  }

  onTaxSelectionChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (Array.isArray(event)) this.initialTaxOptions.set(event);
    else if (!event) this.initialTaxOptions.set([]);
  }

  searchUnitsFn(query: string, page: number) {
    return this.unitsService.findAll({ search: query, page, limit: 8, onlyActive: true, type: this.isService ? 'UNIT' : undefined }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` })),
        hasMore: res.data.length === 8
      }))
    );
  }

  searchPresentationsFn(query: string) {
    return this.presentationService.findAll({ search: query }).pipe(
      map(res => ({
        data: res.data.map((i: any) => ({ value: i.id, label: i.name })),
        hasMore: false
      }))
    );
  }

  searchTaxesFn(query: string) {
    return this.taxService.findAllSimple().pipe(
      map(items => ({
        data: items
          .filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
          .map(i => ({ value: i.id, label: `${i.name} (${i.percentage}%)` })),
        hasMore: false
      }))
    );
  }
}
