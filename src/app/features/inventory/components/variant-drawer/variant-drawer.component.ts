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
import { PresentationService } from '../../../../core/services/presentation.service';
import { TaxService } from '../../../../core/services/tax.service';
import { CategoryAttributeType } from '../../models/product.model';
import { map } from 'rxjs';

@Component({
  selector: 'app-variant-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, SearchSelectComponent, FormButtonComponent, BarcodeFieldComponent],
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
              <p>ID: {{ isNew ? 'Nueva' : '#' + (index + 1) }} · {{ isService ? 'Servicio' : 'Producto Físico' }}</p>
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
                  ></app-search-select>
                </div>

                <div class="field" [class.error]="form.get('unitsPerPack')?.invalid && form.get('unitsPerPack')?.touched">
                  <label>Unidades por empaque *</label>
                  <input type="number" formControlName="unitsPerPack" min="1">
                  @if (form.get('unitsPerPack')?.invalid && form.get('unitsPerPack')?.touched) {
                    <small class="err-msg"><ng-icon name="lucideAlertCircle"></ng-icon> Mínimo 1.</small>
                  }
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
              <div class="form-stack">
                <label class="toggle-row">
                  <div class="toggle-switch-sm" [class.on]="form.get('trackLots')?.value"
                    (click)="form.get('trackLots')?.setValue(!form.get('trackLots')?.value)">
                    <span class="toggle-thumb-sm"></span>
                  </div>
                  <div>
                    <span class="toggle-label">Manejo de lotes</span>
                    <small>Permite identificar cada entrada de mercancía por lote</small>
                  </div>
                </label>
                <label class="toggle-row">
                  <div class="toggle-switch-sm" [class.on]="form.get('trackExpiry')?.value"
                    (click)="form.get('trackExpiry')?.setValue(!form.get('trackExpiry')?.value)">
                    <span class="toggle-thumb-sm"></span>
                  </div>
                  <div>
                    <span class="toggle-label">Manejo de caducidad</span>
                    <small>Controla fechas de vencimiento y alertas de expiración</small>
                  </div>
                </label>

                @if (form.get('stockTrackable')?.value) {
                  <div class="stock-limits">
                    <div class="field">
                      <label>Stock mínimo <span class="optional">Opcional</span></label>
                      <input type="number" formControlName="minimumStock" min="0" placeholder="Ej: 5">
                      <small class="field-hint">Alerta cuando el stock baje de este valor</small>
                    </div>
                    <div class="field">
                      <label>Stock máximo <span class="optional">Opcional</span></label>
                      <input type="number" formControlName="maximumStock" min="0" placeholder="Ej: 100">
                      <small class="field-hint">Techo para reorden automático</small>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Section: Pricing -->
          <div class="section-card">
            <div class="section-kicker">
              <ng-icon name="lucideDollarSign"></ng-icon> Precios
              @if (margin() !== null) {
                <span class="margin-badge" [class.margin--good]="margin()! >= 20" [class.margin--warn]="margin()! > 0 && margin()! < 20" [class.margin--loss]="margin()! <= 0">
                  {{ margin()! <= 0 ? 'Pérdida' : 'Margen ' + (margin()! | number:'1.0-1') + '%' }}
                </span>
              }
            </div>

            <div class="pricing-split">
              <div class="price-field" [class.error]="form.get('salePrice')?.invalid && form.get('salePrice')?.touched">
                <label>PVP (Final) *</label>
                <div class="price-input">
                  <span class="currency">$</span>
                  <input type="number" formControlName="salePrice" step="0.01">
                </div>
              </div>
              <div class="price-field">
                <label>Costo Neto</label>
                <div class="price-input">
                  <span class="currency">$</span>
                  <input type="number" formControlName="costPrice" step="0.01">
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
              ></app-search-select>
            </div>
          </div>


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
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .margin-badge {
      margin-left: auto;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: none;
      letter-spacing: 0;
      &.margin--good { background: color-mix(in srgb, #22c55e 15%, transparent); color: #16a34a; }
      &.margin--warn { background: color-mix(in srgb, #f59e0b 15%, transparent); color: #d97706; }
      &.margin--loss { background: color-mix(in srgb, #ef4444 15%, transparent); color: #dc2626; }
    }

    .form-stack { display: flex; flex-direction: column; gap: 1.25rem; }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--color-text-muted);
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      input {
        background: var(--color-bg-canvas);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        padding: 0.625rem 0.875rem;
        font-size: var(--font-size-sm);
        color: var(--color-text-main);
        width: 100%;
        &:focus { outline: none; border-color: var(--color-accent-primary); }
      }
      &.error input { border-color: var(--color-danger-text); }
      .err-msg { font-size: 11px; color: var(--color-danger-text); display: flex; align-items: center; gap: 4px; }
    }

    .unit-hint { font-weight: 400; text-transform: none; }
    .optional { font-weight: 400; text-transform: none; color: var(--color-text-muted); font-size: 10px; }
    .field-hint { font-size: 11px; color: var(--color-text-muted); }
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
      .toggle-label {
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--color-text-main);
        display: block;
      }
      small {
        font-size: 11px;
        color: var(--color-text-muted);
        margin-top: 2px;
        display: block;
      }
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

    .toggle-switch-sm {
      min-width: 32px;
      height: 18px;
      border-radius: 999px;
      background: var(--color-border-light);
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 2px;
      &.on { background: var(--color-accent-primary); }
    }

    .toggle-thumb-sm {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--color-bg-surface);
      transition: transform 0.2s;
      .toggle-switch-sm.on & { transform: translateX(14px); }
    }

    .pricing-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .price-field {
      background: var(--color-bg-canvas);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--color-text-muted); }
      .price-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        .currency { font-size: 1.25rem; font-weight: 700; color: var(--color-text-muted); }
        input {
          background: transparent;
          border: none;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-text-main);
          width: 100%;
          padding: 0;
          &:focus { outline: none; }
        }
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
  @Input() categoryAttributes: CategoryAttributeType[] = [];
  @Output() saved = new EventEmitter<FormGroup>();
  @Output() cancelled = new EventEmitter<void>();

  private presentationService = inject(PresentationService);
  private taxService = inject(TaxService);

  readonly durationPresets = [15, 30, 45, 60, 90, 120];

  durationLabel(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  initialPresentationOption = signal<SearchSelectOption | undefined>(undefined);
  initialTaxOptions = signal<SearchSelectOption[]>([]);
  margin = signal<number | null>(null);
  imagePreview = signal<string | null>(null);

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
    const presentationId = this.form.get('presentationId')?.value;
    if (presentationId) {
      this.presentationService.findAll({}).subscribe(res => {
        const p = res.data.find((x: any) => x.id === presentationId);
        if (p) this.initialPresentationOption.set({ value: p.id, label: p.name });
      });
    }

    const taxIds = this.form.get('taxIds')?.value as string[];
    if (taxIds?.length) {
      this.taxService.findAll().subscribe(taxes => {
        const matched = taxes.filter(t => taxIds.includes(t.id));
        this.initialTaxOptions.set(matched.map(m => ({ value: m.id, label: `${m.name} (${m.percentage}%)` })));
      });
    }
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
    return this.taxService.findAll().pipe(
      map(items => ({
        data: items
          .filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
          .map(i => ({ value: i.id, label: `${i.name} (${i.percentage}%)` })),
        hasMore: false
      }))
    );
  }
}
