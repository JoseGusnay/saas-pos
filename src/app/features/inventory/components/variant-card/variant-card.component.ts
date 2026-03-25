import { Component, Input, Output, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTrash2, lucidePackage, lucideHash, lucideDollarSign,
  lucideInfo, lucideCheck, lucideLayers, lucideBeaker,
  lucideWine, lucidePercent, lucideBoxes, lucideBox, lucideChevronDown, lucideAlertCircle
} from '@ng-icons/lucide';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { PresentationService } from '../../../../core/services/presentation.service';
import { TaxService } from '../../../../core/services/tax.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-variant-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, SearchSelectComponent],
  providers: [
    provideIcons({
      lucideTrash2, lucidePackage, lucideHash, lucideDollarSign,
      lucideInfo, lucideCheck, lucideLayers, lucideBeaker,
      lucideWine, lucidePercent, lucideBoxes, lucideBox, lucideChevronDown, lucideAlertCircle
    })
  ],
  template: `
    <div class="variant-panel" [formGroup]="form">
      <header class="variant-panel-header">
        <div class="flex items-center gap-3">
          <div class="variant-icon">
            <ng-icon name="lucideBox"></ng-icon>
          </div>
          <div>
            <h4 class="title">{{ form.get('name')?.value || 'Nueva Variante' }}</h4>
            <span class="sku-badge" *ngIf="form.get('sku')?.value">
              SKU: {{ form.get('sku')?.value }}
            </span>
          </div>
        </div>
        <button *ngIf="canRemove" type="button" class="btn-remove" (click)="remove.emit(index)">
          <ng-icon name="lucideTrash2"></ng-icon>
        </button>
      </header>
      
      <div class="variant-panel-body">
        
        <!-- Section: Identity -->
        <div class="variant-section-title">
          <span class="dot"></span> Identidad de Variante
        </div>
        
        <div class="native-grid-2">
          <div class="native-control" [class.has-error]="form.get('name')?.invalid && form.get('name')?.touched">
            <label>Nombre de Variante *</label>
            <input type="text" formControlName="name" placeholder="Ej: 750ml Standard">
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <small class="error-msg">
                <ng-icon name="lucideAlertCircle"></ng-icon>
                El nombre es requerido.
              </small>
            }
          </div>
          <div class="native-control">
            <label>SKU Interno</label>
            <input type="text" formControlName="sku" placeholder="Cód. Referencia">
          </div>
        </div>

        <div class="native-grid-2" *ngIf="productType === 'PHYSICAL'">
          <div class="native-control">
            <label>Presentación</label>
            <app-search-select
              formControlName="presentationId"
              placeholder="Ej: Botella Vidrio"
              [searchFn]="searchPresentationsFn.bind(this)"
              [initialOption]="initialPresentationOption()"
            ></app-search-select>
          </div>
          <div class="native-control" [class.has-error]="form.get('unitsPerPack')?.invalid && form.get('unitsPerPack')?.touched">
            <label>Unidades por empaque *</label>
            <input type="number" formControlName="unitsPerPack" min="1">
            @if (form.get('unitsPerPack')?.invalid && form.get('unitsPerPack')?.touched) {
              <small class="error-msg">
                <ng-icon name="lucideAlertCircle"></ng-icon>
                Mínimo 1 unidad.
              </small>
            }
          </div>
        </div>

        <!-- Section: Pricing -->
        <div class="variant-divider"></div>
        <div class="variant-section-title">
          <span class="dot"></span> Estructura de Precios
        </div>

        <div class="pricing-grid">
          <div class="price-box" [class.has-error]="form.get('salePrice')?.invalid && form.get('salePrice')?.touched">
            <label>PVP (Final con IVA) *</label>
            <div class="input-with-symbol">
              <span class="symbol">$</span>
              <input type="number" formControlName="salePrice" step="0.01">
            </div>
            @if (form.get('salePrice')?.invalid && form.get('salePrice')?.touched) {
              <small class="error-msg">
                <ng-icon name="lucideAlertCircle"></ng-icon>
                Precio requerido.
              </small>
            }
            <p class="hint">IVA / ICE calculados automáticamente</p>
          </div>
          <div class="price-box muted" [class.has-error]="form.get('costPrice')?.invalid && form.get('costPrice')?.touched">
            <label>Costo Neto *</label>
            <div class="input-with-symbol">
              <span class="symbol">$</span>
              <input type="number" formControlName="costPrice" step="0.01">
            </div>
            @if (form.get('costPrice')?.invalid && form.get('costPrice')?.touched) {
              <small class="error-msg">
                <ng-icon name="lucideAlertCircle"></ng-icon>
                Costo requerido.
              </small>
            }
            <p class="hint">Base imponible de compra</p>
          </div>
        </div>

        <!-- Section: Technical -->
        <div class="variant-divider"></div>
        <div class="variant-section-title">
          <span class="dot"></span> Especificaciones y Fiscalidad
        </div>

        <div class="native-control">
          <label>Impuestos Aplicables</label>
          <app-search-select
            formControlName="taxIds"
            placeholder="Añadir impuestos (IVA, ICE...)"
            [multiple]="true"
            [searchFn]="searchTaxesFn.bind(this)"
            [initialOptions]="initialTaxOptions()"
          ></app-search-select>
        </div>

        <div class="native-grid-3" *ngIf="productType === 'PHYSICAL'">
          <div class="native-control">
            <label>Volumen (ML)</label>
            <input type="number" formControlName="volumeMl">
          </div>
          <div class="native-control">
            <label>% Alcohólico</label>
            <input type="number" formControlName="alcoholPercentage" step="0.01">
          </div>
          <div class="native-control">
            <label>Cód. EAN-13</label>
            <input type="text" formControlName="barcode" placeholder="786...">
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .variant-panel {
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .variant-panel-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border-subtle);
      background-color: var(--color-bg-hover);
      display: flex;
      justify-content: space-between;
      align-items: center;

      .variant-icon {
        color: var(--color-text-muted);
        font-size: 1.125rem;
      }

      .title {
        font-size: var(--font-size-base);
        font-weight: 700;
        color: var(--color-text-main);
        margin: 0;
      }

      .sku-badge {
        font-size: 10px;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05rem;
      }
    }

    .variant-panel-body {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .variant-divider {
      height: 1px;
      background-color: var(--color-border-subtle);
      width: 100%;
      margin: 0.5rem 0;
    }

    .variant-section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05rem;
      color: var(--color-text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: -0.5rem;
      
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: var(--color-accent-primary);
        opacity: 0.8;
      }
    }

    .native-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
    .native-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.5rem; }

    .native-control {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--color-text-muted);
      }

      input {
        background: var(--color-bg-canvas); // Subtle contrast against surface
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        padding: 0.75rem 1rem; // Taller, more clickable area
        font-size: var(--font-size-sm);
        color: var(--color-text-main);
        transition: all var(--transition-fast);

        &:hover { border-color: var(--color-border-main); }
        &:focus { 
          border-color: var(--color-accent-primary); 
          outline: none; 
          box-shadow: var(--shadow-input-focus);
          background: var(--color-bg-surface);
        }
        &::placeholder { color: var(--color-text-muted); opacity: 0.5; }
      }

      &.has-error {
        input {
          border-color: var(--color-danger-text) !important;
          background-color: rgba(var(--color-danger-rgb), 0.02);
          &:focus {
            box-shadow: 0 0 0 2px rgba(var(--color-danger-rgb), 0.1);
          }
        }
      }

      .error-msg {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--color-danger-text);
        font-size: 11px;
        font-weight: 500;
        margin-top: 0.35rem;

        ng-icon {
          font-size: 12px;
          opacity: 0.9;
        }
      }
    }

    .error-msg {
      font-size: var(--font-size-xs);
      color: var(--color-danger-text);
      margin-top: 0.25rem;
      display: block;
      font-weight: 500;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5rem;

      .price-box {
        padding: 1.5rem;
        background-color: var(--color-bg-canvas);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border-light);
        transition: border-color var(--transition-fast);

        &:hover { border-color: var(--color-border-main); }
        &.muted { opacity: 0.85; background-color: var(--color-bg-surface); }
        
        &.has-error {
          border-color: var(--color-danger-text) !important;
          background-color: rgba(var(--color-danger-rgb), 0.02) !important;
        }

        label { 
          font-size: 11px; 
          font-weight: 800; 
          text-transform: uppercase; 
          color: var(--color-text-main); 
          display: block; 
          margin-bottom: 0.75rem; 
        }
        
        .input-with-symbol {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          
          .symbol { 
            font-size: 1.75rem; 
            font-weight: 600; 
            color: var(--color-text-muted); 
          }
          input { 
            background: transparent; 
            border: none; 
            font-size: 1.75rem; 
            font-weight: 800; 
            color: var(--color-text-main); 
            width: 100%;
            padding: 0;
            
            &:focus { outline: none; }
          }
        }
        
        .hint { 
          font-size: 10px; 
          font-weight: 700; 
          text-transform: uppercase; 
          color: var(--color-text-muted); 
          margin-top: 0.75rem; 
          opacity: 0.7;
        }
      }
    }

    .btn-remove {
      background: transparent;
      border: 1px solid transparent;
      color: var(--color-text-muted);
      padding: 0.5rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      &:hover { color: var(--color-danger-text); background-color: var(--color-danger-bg); }
    }

    // Responsive Rules
    @media (max-width: 1400px) {
      .variant-panel-header {
        padding: 1rem;
      }
      .variant-panel-body {
        padding: 1.5rem; // Reduced from 2.5rem
        gap: 1.25rem;
      }
      .native-grid-2, .native-grid-3 {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
      .pricing-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .price-box {
        padding: 1.25rem; // Reduced from 1.5rem
        .input-with-symbol {
          .symbol, input { font-size: 1.5rem; }
        }
      }
    }
  `]
})
export class VariantCardComponent implements OnInit {
  @Input({ required: true }) form!: FormGroup;
  @Input() index: number = 0;
  @Input() productType: 'PHYSICAL' | 'SERVICE' = 'PHYSICAL';
  @Input() canRemove: boolean = false;
  @Output() remove = new EventEmitter<number>();

  private presentationService = inject(PresentationService);
  private taxService = inject(TaxService);

  initialPresentationOption = signal<SearchSelectOption | undefined>(undefined);
  initialTaxOptions = signal<SearchSelectOption[]>([]);

  ngOnInit() {
    this.loadInitialOptions();
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
      this.taxService.findAllSimple().subscribe(taxes => {
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
