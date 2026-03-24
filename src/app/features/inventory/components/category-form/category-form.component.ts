import {
  Component,
  inject,
  signal,
  computed,
  Output,
  EventEmitter,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { CategoryService } from '../../../../core/services/category.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Category } from '../../../../core/models/category.models';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent, SearchSelectComponent],
  template: `
    <form [formGroup]="categoryForm" class="cf">

      <app-field-input
        label="Nombre de la Categoría"
        formControlName="name"
        placeholder="Ej. Bebidas, Electrónicos..."
        [required]="true"
        [errorMessages]="{ required: 'El nombre es requerido' }"
      ></app-field-input>

      <app-field-input
        label="Descripción"
        formControlName="description"
        placeholder="Describe brevemente esta categoría..."
        [optional]="true"
        [multiline]="true"
        [rows]="3"
      ></app-field-input>

      <div class="cf__field">
        <label class="cf__label">Categoría Padre</label>
        <app-search-select
          formControlName="parentId"
          placeholder="Ninguna (Categoría Raíz)"
          searchPlaceholder="Buscar categoría padre..."
          [searchFn]="searchCategoriesFn.bind(this)"
          [initialOption]="parentCategoryOption()"
        ></app-search-select>
        <span class="cf__hint">Opcional. Permite organizar categorías en sub-niveles.</span>
      </div>

      <div class="cf__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Categoría activa"
        description="Las categorías inactivas no se muestran en el catálogo"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .cf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .cf__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cf__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }
    .cf__hint {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .cf__divider {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
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
    isActive: [true],
  });

  searchCategoriesFn(query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> {
    return this.categoryService.findAll({
      search: query,
      page,
      limit: 15,
      filterModel: {
        status: { filterType: 'text', type: 'equals', filter: 'ACTIVE' },
      },
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
              icon: 'lucideFolder',
            })),
          hasMore: res.data.length === 15,
        };
      })
    );
  }

  setCategory(category: Category) {
    this.category.set(category);

    if (category.parent) {
      this.parentCategoryOption.set({
        label: category.parent.name,
        value: category.parent.id,
        icon: 'lucideFolder',
      });
    } else {
      this.parentCategoryOption.set(undefined);
    }

    this.categoryForm.patchValue({
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      isActive: category.status === 'ACTIVE',
    });
    this.categoryForm.markAsPristine();
  }

  resetForm() {
    this.category.set(null);
    this.parentCategoryOption.set(undefined);
    this.categoryForm.reset({ isActive: true });
    this.categoryForm.markAsPristine();
  }

  onSubmit() {
    if (this.categoryForm.invalid || this.isSubmitting()) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const data = this.categoryForm.value;
    const id = this.editingCategoryId();

    const cleanData: any = {
      name: data.name || '',
      description: data.description ?? undefined,
      parentId: (data.parentId === 'null' || !data.parentId) ? undefined : data.parentId,
      status: data.isActive ? 'ACTIVE' : 'INACTIVE',
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
      error: (err) => {
        this.toastService.error(err?.error?.error ?? `Error al ${id ? 'actualizar' : 'crear'} la categoría`);
        this.isSubmitting.set(false);
      },
    });
  }

  hasUnsavedChanges(): boolean {
    return this.categoryForm.dirty;
  }
}
