import {
  Component, Input, OnChanges, SimpleChanges, inject, signal, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormArray, FormBuilder, FormGroup,
  ReactiveFormsModule, Validators
} from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideTrash2, lucideFlaskConical, lucideSearch, lucideX, lucideAlertTriangle
} from '@ng-icons/lucide';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import {
  debounceTime, distinctUntilChanged, map, Subject, switchMap, of, takeUntil
} from 'rxjs';
import { ProductService } from '../../services/product.service';
import { UnitsService } from '../../../../core/services/units.service';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';

interface IngredientResult {
  variantId: string;
  variantName: string;
  productName: string;
  sku?: string;
}

@Component({
  selector: 'app-recipe-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, SearchSelectComponent, ModalComponent, FieldInputComponent],
  providers: [
    provideIcons({ lucidePlus, lucideTrash2, lucideFlaskConical, lucideSearch, lucideX, lucideAlertTriangle })
  ],
  templateUrl: './recipe-builder.component.html',
  styleUrl: './recipe-builder.component.scss'
})
export class RecipeBuilderComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) recipeGroup!: FormGroup;

  private fb = inject(FormBuilder);
  private productSvc = inject(ProductService);
  private unitsSvc = inject(UnitsService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // Confirm disable modal
  showDisableConfirm = signal(false);

  // Ingredient search
  ingredientSearch = signal('');
  ingredientResults = signal<IngredientResult[]>([]);
  isSearchingIngredients = signal(false);
  noIngredientResults = signal(false);
  private ingredientSearch$ = new Subject<string>();

  // Per-ingredient initial unit options (keyed by index)
  ingredientUnitOptions = signal<Record<number, SearchSelectOption | undefined>>({});
  initialYieldUnitOption = signal<SearchSelectOption | undefined>(undefined);

  get enabled(): boolean {
    return this.recipeGroup.get('enabled')?.value;
  }

  get ingredients(): FormArray {
    return this.recipeGroup.get('ingredients') as FormArray;
  }

  asGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  searchYieldUnitFn = (query: string) =>
    this.unitsSvc.findAll({ search: query, onlyActive: true }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({
          value: u.id,
          label: `${u.name} (${u.abbreviation})`
        } as SearchSelectOption)),
        hasMore: false
      }))
    );

  ngOnInit() {
    // Inicializa validators según estado actual del toggle
    this.applyRecipeValidators(this.enabled);

    this.ingredientSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.length < 2) {
          this.ingredientResults.set([]);
          this.noIngredientResults.set(false);
          this.isSearchingIngredients.set(false);
          return of([]);
        }
        this.isSearchingIngredients.set(true);
        return this.productSvc.searchVariants(q, undefined, ['RAW_MATERIAL']);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data: any[]) => {
        this.isSearchingIngredients.set(false);
        this.ingredientResults.set(data);
        this.noIngredientResults.set(data.length === 0 && this.ingredientSearch().length >= 2);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSearchingIngredients.set(false);
        this.ingredientResults.set([]);
      }
    });

    // Load initial unit options for existing ingredients
    this.loadInitialUnitOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['recipeGroup'] && !changes['recipeGroup'].isFirstChange()) {
      // El grupo fue reemplazado desde fuera (ej: setControl en edición).
      // Re-inicializar validators y opciones de unidades con el nuevo grupo.
      this.applyRecipeValidators(this.enabled);
      this.loadInitialUnitOptions();
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleEnabled() {
    if (this.enabled && this.ingredients.length > 0) {
      // Hay ingredientes: pedir confirmación antes de desactivar
      this.showDisableConfirm.set(true);
      return;
    }
    this._doDisableOrEnable();
  }

  confirmDisableRecipe() {
    this.showDisableConfirm.set(false);
    // Limpiar todos los ingredientes y desactivar
    while (this.ingredients.length > 0) {
      this.ingredients.removeAt(0);
    }
    this.ingredientUnitOptions.set({});
    this._doDisableOrEnable();
  }

  cancelDisableRecipe() {
    this.showDisableConfirm.set(false);
  }

  private _doDisableOrEnable() {
    const ctrl = this.recipeGroup.get('enabled')!;
    const newVal = !ctrl.value;
    ctrl.setValue(newVal);
    this.applyRecipeValidators(newVal);
  }

  private applyRecipeValidators(enabled: boolean) {
    const yieldCtrl = this.recipeGroup.get('yield')!;
    const unitCtrl = this.recipeGroup.get('yieldUnitId')!;
    const ingredientsCtrl = this.recipeGroup.get('ingredients') as FormArray;
    if (enabled) {
      yieldCtrl.setValidators([Validators.required, Validators.min(0.0001)]);
      unitCtrl.setValidators([Validators.required]);
      ingredientsCtrl.setValidators([(ctrl) => (ctrl as FormArray).length > 0 ? null : { required: true }]);
    } else {
      yieldCtrl.setValidators([Validators.min(0.0001)]);
      unitCtrl.clearValidators();
      ingredientsCtrl.clearValidators();
    }
    yieldCtrl.updateValueAndValidity({ emitEvent: false });
    unitCtrl.updateValueAndValidity({ emitEvent: false });
    ingredientsCtrl.updateValueAndValidity({ emitEvent: false });
  }

  onIngredientSearchInput(event: Event) {
    const q = (event.target as HTMLInputElement).value;
    this.ingredientSearch.set(q);
    this.ingredientSearch$.next(q);
  }

  onIngredientSearchBlur() {
    setTimeout(() => {
      this.ingredientResults.set([]);
      this.noIngredientResults.set(false);
      this.cdr.markForCheck();
    }, 150);
  }

  clearIngredientSearch() {
    this.ingredientSearch.set('');
    this.ingredientResults.set([]);
    this.noIngredientResults.set(false);
    this.ingredientSearch$.next('');
  }

  isIngredientAdded(variantId: string): boolean {
    return this.ingredients.controls.some(c => c.get('variantId')?.value === variantId);
  }

  addIngredient(r: IngredientResult) {
    if (this.isIngredientAdded(r.variantId)) return;
    this.ingredients.push(this.fb.group({
      variantId: [r.variantId, Validators.required],
      variantName: [r.variantName !== r.productName ? `${r.productName} — ${r.variantName}` : r.productName],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      unitId: ['', Validators.required],
      unitName: [''],
      notes: ['']
    }));
    this.clearIngredientSearch();
  }

  removeIngredient(index: number) {
    this.ingredients.removeAt(index);
    // Reindexar: shift down todas las claves > index para mantener sincronía con el array
    const oldOpts = this.ingredientUnitOptions();
    const newOpts: Record<number, SearchSelectOption | undefined> = {};
    for (const key of Object.keys(oldOpts).map(Number)) {
      if (key < index) newOpts[key] = oldOpts[key];
      else if (key > index) newOpts[key - 1] = oldOpts[key];
    }
    this.ingredientUnitOptions.set(newOpts);
  }

  getIngredientUnitOption(index: number): SearchSelectOption | undefined {
    return this.ingredientUnitOptions()[index];
  }

  onIngredientUnitChange(index: number, event: SearchSelectOption | SearchSelectOption[] | null) {
    if (Array.isArray(event)) return;
    const opts = { ...this.ingredientUnitOptions() };
    opts[index] = event ?? undefined;
    this.ingredientUnitOptions.set(opts);
    this.ingredients.at(index).patchValue({
      unitId: event?.value ?? '',
      unitName: event?.label ?? ''
    });
  }

  searchIngredientUnitFn = (query: string) =>
    this.unitsSvc.findAll({ search: query, onlyActive: true }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({
          value: u.id,
          label: `${u.name} (${u.abbreviation})`
        } as SearchSelectOption)),
        hasMore: false
      }))
    );

  private loadInitialUnitOptions() {
    const ingredientUnitIds = this.ingredients.controls
      .map((ctrl, i) => ({ i, unitId: ctrl.get('unitId')?.value }))
      .filter(x => x.unitId);

    const yieldUnitId = this.recipeGroup.get('yieldUnitId')?.value;

    if (!ingredientUnitIds.length && !yieldUnitId) return;

    this.unitsSvc.findAll({ onlyActive: false }).subscribe(res => {
      // Ingredient units
      const opts: Record<number, SearchSelectOption | undefined> = {};
      for (const { i, unitId } of ingredientUnitIds) {
        const u = res.data.find((x: any) => x.id === unitId);
        if (u) opts[i] = { value: u.id, label: `${u.name} (${u.abbreviation})` };
      }
      this.ingredientUnitOptions.set(opts);

      // Yield unit
      if (yieldUnitId) {
        const u = res.data.find((x: any) => x.id === yieldUnitId);
        if (u) this.initialYieldUnitOption.set({ value: u.id, label: `${u.name} (${u.abbreviation})` });
      }

      this.cdr.markForCheck();
    });
  }
}
