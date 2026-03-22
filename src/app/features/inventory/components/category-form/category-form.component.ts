import {
  Component,
  inject,
  signal,
  computed,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTag,
  lucideInfo,
  lucideFolder,
  lucideCheck,
  lucideX,
  lucideChevronDown
} from '@ng-icons/lucide';
import { CategoryService } from '../../../../core/services/category.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Category } from '../../../../core/models/category.models';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIconComponent,
    SearchSelectComponent
  ],
  providers: [
    provideIcons({
      lucideTag,
      lucideInfo,
      lucideFolder,
      lucideCheck,
      lucideX,
      lucideChevronDown
    })
  ],
  template: `
    <div class="category-form-container">
      <form [formGroup]="categoryForm" (ngSubmit)="onSubmit()" class="premium-form">
        <div class="form-sections">
          <!-- Información Básica -->
          <section class="form-section">
            <h3 class="section-title">Información Básica</h3>
            
            <div class="form-grid">
              <div class="form-group full-width">
                <label for="name">Nombre de la Categoría</label>
                <div class="input-wrapper" [class.invalid]="categoryForm.get('name')?.invalid && categoryForm.get('name')?.touched">
                  <ng-icon name="lucideTag" class="input-icon"></ng-icon>
                  <input 
                    id="name" 
                    type="text" 
                    formControlName="name" 
                    placeholder="Ej. Bebidas, Electrónicos..."
                  >
                  @if (categoryForm.get('name')?.valid && categoryForm.get('name')?.value) {
                    <ng-icon name="lucideCheck" class="status-icon success"></ng-icon>
                  }
                </div>
                @if (categoryForm.get('name')?.invalid && categoryForm.get('name')?.touched) {
                  <small class="error-msg">El nombre es requerido</small>
                }
              </div>

              <div class="form-group full-width">
                <label for="description">Descripción</label>
                <div class="input-wrapper textarea" [class.invalid]="categoryForm.get('description')?.invalid && categoryForm.get('description')?.touched">
                  <ng-icon name="lucideInfo" class="input-icon"></ng-icon>
                  <textarea 
                    id="description" 
                    formControlName="description" 
                    placeholder="Describe brevemente esta categoría..."
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>
          </section>

          <!-- Jerarquía -->
          <section class="form-section">
            <h3 class="section-title">Jerarquía</h3>

            <div class="form-grid">
              <div class="form-group full-width">
                <label for="parentId">Categoría Padre</label>
                <app-search-select
                  formControlName="parentId"
                  placeholder="Ninguna (Categoría Raíz)"
                  searchPlaceholder="Buscar categoría padre..."
                  [searchFn]="searchCategoriesFn.bind(this)"
                  [initialOption]="parentCategoryOption()"
                ></app-search-select>
                <p class="input-hint">Opcional. Permite organizar categorías en sub-niveles.</p>
              </div>
            </div>
          </section>

          <!-- Estado -->
          <section class="form-section">
            <h3 class="section-title">Ajustes y Estado</h3>
            <div class="form-switches">
              <div class="form-check">
                <input id="isActive" type="checkbox" formControlName="isActive">
                <label for="isActive">Categoría activa</label>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .category-form-container {
      background: var(--color-bg-surface);
      width: 100%;
      box-sizing: border-box;
    }

    .premium-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;

      .form-sections {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;

        .section-title {
          font-size: var(--font-size-xs);
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--color-border-subtle);
          padding-bottom: 0.5rem;
          margin-bottom: 0.5rem;
        }
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;

        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }

        .full-width {
          grid-column: span 2;
        }
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
          display: block;
          width: 100%;

          .input-icon {
            position: absolute;
            left: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-muted);
            font-size: 1rem;
            z-index: 5;
            pointer-events: none;
          }

          input, textarea, select {
            width: 100%;
            box-sizing: border-box;
            padding: 0.625rem 0.875rem 0.625rem 2.5rem;
            background: var(--color-bg-surface);
            border: 1px solid var(--color-border-light);
            border-radius: var(--radius-md);
            font-size: var(--font-size-base);
            color: var(--color-text-main);
            transition: var(--transition-fast);
            outline: none;
            display: block;

            &:focus {
              border-color: var(--color-accent-primary);
              box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
            }

            &::placeholder {
              color: var(--color-text-muted);
            }
          }

          &.invalid {
            input, textarea, select {
              border-color: var(--color-danger);
              background: rgba(var(--color-danger-rgb), 0.02);
            }
          }

          textarea {
            resize: vertical;
            min-height: 80px;
          }

          .status-icon {
            position: absolute;
            right: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1rem;
            z-index: 5;

            &.success { color: var(--color-success); }
            &.error { color: var(--color-danger); }
          }

          &.select-wrapper {
            select {
              appearance: none;
              cursor: pointer;
              padding-right: 2.5rem;
            }

            .select-chevron {
              position: absolute;
              right: 0.875rem;
              top: 50%;
              transform: translateY(-50%);
              pointer-events: none;
              color: var(--color-text-muted);
              font-size: 1rem;
              z-index: 5;
            }
          }
        }

        .input-hint {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }
      }

      .form-switches {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding-top: 0.5rem;
      }

      .form-check {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;

        input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: var(--color-accent-primary);
          cursor: pointer;
        }

        label {
          font-size: var(--font-size-base);
          color: var(--color-text-main);
          cursor: pointer;
        }
      }

      .error-msg {
        font-size: var(--font-size-xs);
        color: var(--color-danger-text);
        margin-top: 0.25rem;
        display: block;
      }
    }

    @media (max-width: 640px) {
      .premium-form .form-grid {
        grid-template-columns: 1fr;
        .full-width { grid-column: span 1; }
      }
    }
  `]
})
export class CategoryFormComponent {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<Category>();

  category = signal<Category | null>(null);
  editingCategoryId = computed(() => this.category()?.id);
  parentCategoryOption = signal<SearchSelectOption | undefined>(undefined);
  isSubmitting = signal(false);

  categoryForm = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    parentId: [null as string | null],
    isActive: [true]
  });

  searchCategoriesFn(query: string, page: number): Observable<{ data: SearchSelectOption[], hasMore: boolean }> {
    return this.categoryService.findAll({
      search: query,
      page,
      limit: 15,
      filterModel: {
        status: { filterType: 'text', type: 'equals', filter: 'ACTIVE' }
      }
    }).pipe(
      map(res => {
        const currentId = this.editingCategoryId();
        return {
          data: res.data
            .filter(c => c.id !== currentId)
            .map(c => ({
              label: c.name,
              value: c.id,
              description: c.description ?? undefined,
              icon: 'lucideFolder'
            })),
          hasMore: res.data.length === 15
        };
      })
    );
  }

  setCategory(category: Category) {
    this.category.set(category);
    
    // Si tiene padre, preparamos la opción para el select (evita mostrar el ID)
    if (category.parent) {
      this.parentCategoryOption.set({
        label: category.parent.name,
        value: category.parent.id,
        icon: 'lucideFolder'
      });
    } else {
      this.parentCategoryOption.set(undefined);
    }

    this.categoryForm.patchValue({
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      isActive: category.status === 'ACTIVE'
    });
  }

  resetForm() {
    this.category.set(null);
    this.parentCategoryOption.set(undefined);
    this.categoryForm.reset({
      isActive: true
    });
  }

  onSubmit() {
    if (this.categoryForm.invalid || this.isSubmitting()) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const data = this.categoryForm.value;
    const id = this.editingCategoryId();

    // Ensure types match Category interface (no nulls for required fields)
    const cleanData: any = {
      name: data.name || '',
      description: data.description ?? undefined,
      parentId: (data.parentId === 'null' || !data.parentId) ? undefined : data.parentId,
      status: data.isActive ? 'ACTIVE' : 'INACTIVE'
    };

    const request$ = id
      ? this.categoryService.update(id, cleanData)
      : this.categoryService.create(cleanData);

    request$.subscribe({
      next: (category) => {
        this.toastService.success(`Categoría ${id ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit(category);
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: () => {
        this.toastService.error('Error al guardar la categoría');
        this.isSubmitting.set(false);
      }
    });
  }

  hasUnsavedChanges(): boolean {
    return this.categoryForm.dirty;
  }
}
