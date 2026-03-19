import { Component, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { CreateProductPayload } from '../../models/product.model';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideInfo, lucideTag, lucideFolder, lucideCheck, lucideChevronDown, lucideDollarSign, lucideHash } from '@ng-icons/lucide';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-product-quick-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, SearchSelectComponent],
  providers: [provideIcons({ lucidePlus, lucideInfo, lucideTag, lucideFolder, lucideCheck, lucideChevronDown, lucideDollarSign, lucideHash })],
  template: `
    <form [formGroup]="quickForm" class="premium-form" (ngSubmit)="onSubmit()">
      <div class="form-sections">
        <section class="form-section">
          <div class="form-grid">
            <!-- Nombre -->
            <div class="form-group full-width" [class.has-error]="quickForm.get('name')?.invalid && quickForm.get('name')?.touched">
              <label for="name">Nombre del Producto *</label>
              <div class="input-wrapper">
                <ng-icon name="lucideTag" class="input-icon"></ng-icon>
                <input id="name" type="text" formControlName="name" placeholder="Ej: Coca Cola 350ml">
                @if (quickForm.get('name')?.valid && quickForm.get('name')?.value) {
                  <ng-icon name="lucideCheck" class="status-icon success"></ng-icon>
                }
              </div>
              @if (quickForm.get('name')?.invalid && quickForm.get('name')?.touched) {
                <small class="error-msg">El nombre es requerido.</small>
              }
            </div>

            <!-- Categoría -->
            <div class="form-group col-span-2" [class.has-error]="quickForm.get('categoryId')?.invalid && quickForm.get('categoryId')?.touched">
              <label for="categoryId">Categoría *</label>
              <app-search-select
                id="categoryId"
                formControlName="categoryId"
                placeholder="Seleccionar categoría..."
                searchPlaceholder="Buscar categorías..."
                [searchFn]="searchCategoriesFn.bind(this)"
              ></app-search-select>
              @if (quickForm.get('categoryId')?.invalid && quickForm.get('categoryId')?.touched) {
                 <small class="error-msg">Debes seleccionar una categoría.</small>
              }
            </div>

            <!-- Precio y SKU -->
            <div class="form-group" [class.has-error]="quickForm.get('salePrice')?.invalid && quickForm.get('salePrice')?.touched">
              <label for="salePrice">Precio Venta ($) *</label>
              <div class="input-wrapper">
                <ng-icon name="lucideDollarSign" class="input-icon"></ng-icon>
                <input id="salePrice" type="number" formControlName="salePrice" step="0.01">
              </div>
              @if (quickForm.get('salePrice')?.invalid && quickForm.get('salePrice')?.touched) {
                 <small class="error-msg">Ingresa un precio válido.</small>
              }
            </div>

            <div class="form-group">
              <label for="sku">SKU / Código</label>
              <div class="input-wrapper">
                <ng-icon name="lucideHash" class="input-icon"></ng-icon>
                <input id="sku" type="text" formControlName="sku" placeholder="Opcional">
              </div>
            </div>
          </div>
        </section>

        <p class="hint-text mt-3">
          <ng-icon name="lucideInfo"></ng-icon>
          Esta es una creación simplificada. Para variantes complejas o impuestos detallados, usa el formulario maestro.
        </p>
      </div>
    </form>
  `,
  styles: [`
    .premium-form {
      // padding: 1.5rem;
      box-sizing: border-box;
      
      .form-sections { display: flex; flex-direction: column; gap: 1.5rem; }
      .form-section { display: flex; flex-direction: column; gap: 1rem; }
      
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
        
        .full-width { grid-column: span 2; }
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        label {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-main);
        }

        .input-wrapper {
          position: relative;
          
          .input-icon {
            position: absolute;
            left: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-muted);
            font-size: 1rem;
            z-index: 5;
          }

          input {
            width: 100%;
            padding: 0.625rem 0.875rem 0.625rem 2.5rem;
            background: var(--color-bg-surface);
            border: 1px solid var(--color-border-light);
            border-radius: var(--radius-md);
            font-size: var(--font-size-base);
            color: var(--color-text-main);
            outline: none;
            transition: var(--transition-fast);

            &:focus {
              border-color: var(--color-accent-primary);
              box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
            }
          }

        &.has-error {
          input { border-color: var(--color-danger-text) !important; }
        }

        .error-msg {
          font-size: var(--font-size-xs);
          color: var(--color-danger-text);
          margin-top: 0.25rem;
          display: block;
          font-weight: 500;
        }
      }

      .hint-text {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1rem;
      }
    }
  }

  @media (max-width: 640px) {
    .premium-form {
      .form-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
        .col-span-2 { grid-column: span 1; }
      }
    }
  }
`]
})
export class ProductQuickFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private toastService = inject(ToastService);

  @Output() success = new EventEmitter<void>();

  quickForm!: FormGroup;
  isSubmitting = signal(false);
  categories = signal<any[]>([]);

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    // We don't need to load categories here because SearchSelect will call searchFn
  }

  searchCategoriesFn(query: string, page: number): Observable<{ data: SearchSelectOption[], hasMore: boolean }> {
    return this.categoryService.findAll({
      search: query,
      page,
      limit: 15,
      filterModel: {
        status: { filterType: 'text', type: 'equals', filter: 'ACTIVE' }
      }
    }).pipe(
      map(res => ({
        data: res.data.map(c => ({
          label: c.name,
          value: c.id,
          description: c.description ?? undefined,
          icon: 'lucideFolder'
        })),
        hasMore: res.data.length === 15
      }))
    );
  }

  private initForm() {
    this.quickForm = this.fb.group({
      name: ['', Validators.required],
      categoryId: ['', Validators.required],
      salePrice: [0, [Validators.required, Validators.min(0)]],
      sku: ['']
    });
  }

  onSubmit() {
    if (this.quickForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.quickForm.value;

    const payload: CreateProductPayload = {
      name: val.name,
      categoryId: val.categoryId,
      variants: [
        {
          name: 'Principal',
          salePrice: Number(val.salePrice),
          costPrice: 0,
          sku: val.sku || undefined,
          unitsPerPack: 1
        }
      ]
    };

    this.productService.create(payload).subscribe({
      next: () => {
        this.toastService.success('Producto rápido creado correctamente');
        this.isSubmitting.set(false);
        this.quickForm.reset({ salePrice: 0 }); // Clean form heavily
        this.success.emit();
      },
      error: () => {
        this.toastService.error('Error al crear el producto');
        this.isSubmitting.set(false);
      }
    });
  }
}
