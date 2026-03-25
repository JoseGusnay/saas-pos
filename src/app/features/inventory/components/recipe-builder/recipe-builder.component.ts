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
  lucidePlus, lucideTrash2, lucideFlaskConical, lucideSearch, lucideX, lucideAlertTriangle, lucidePencil
} from '@ng-icons/lucide';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { UnitDrawerComponent } from '../unit-drawer/unit-drawer.component';
import { Unit } from '../../../../core/models/unit.models';
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
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, SearchSelectComponent, ModalComponent, FieldInputComponent, DrawerComponent, UnitDrawerComponent, FormButtonComponent],
  providers: [
    provideIcons({ lucidePlus, lucideTrash2, lucideFlaskConical, lucideSearch, lucideX, lucideAlertTriangle, lucidePencil })
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

  // Ingredient drawer
  ingredientDrawerOpen  = signal(false);
  editingIngredientIndex = signal<number | null>(null);

  // Unit quick-create
  unitCreateOpen = signal(false);
  unitCreateFor  = signal<'yield' | 'ingredient'>('yield');

  get enabled(): boolean {
    return this.recipeGroup.get('enabled')?.value;
  }

  get ingredients(): FormArray {
    return this.recipeGroup.get('ingredients') as FormArray;
  }

  get editingIngredient(): FormGroup | null {
    const i = this.editingIngredientIndex();
    if (i === null || i >= this.ingredients.length) return null;
    return this.asGroup(this.ingredients.at(i));
  }

  get editingIngredientName(): string {
    const i = this.editingIngredientIndex();
    if (i === null) return 'Ingrediente';
    return this.ingredients.at(i)?.get('variantName')?.value || 'Ingrediente';
  }

  asGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  openIngredientDrawer(index: number) {
    this.editingIngredientIndex.set(index);
    this.ingredientDrawerOpen.set(true);
  }

  closeIngredientDrawer() {
    this.ingredientDrawerOpen.set(false);
    this.editingIngredientIndex.set(null);
  }

  searchYieldUnitFn = (query: string, page: number) =>
    this.unitsSvc.findAll({ search: query, page, limit: 8, onlyActive: true }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({
          value: u.id,
          label: `${u.name} (${u.abbreviation})`
        } as SearchSelectOption)),
        hasMore: res.data.length === 8
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
      // Clear all recipe fields when disabled
      yieldCtrl.reset(null, { emitEvent: false });
      unitCtrl.reset('', { emitEvent: false });
      this.recipeGroup.get('notes')!.reset('', { emitEvent: false });
      ingredientsCtrl.clear();
      this.initialYieldUnitOption.set(undefined);

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
      quantity: [null, [Validators.required, Validators.min(0.0001)]],
      unitId: ['', Validators.required],
      unitName: [''],
      notes: ['']
    }));
    const newIndex = this.ingredients.length - 1;
    this.clearIngredientSearch();
    this.openIngredientDrawer(newIndex);
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

  searchIngredientUnitFn = (query: string, page: number) =>
    this.unitsSvc.findAll({ search: query, page, limit: 8, onlyActive: true }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({
          value: u.id,
          label: `${u.name} (${u.abbreviation})`
        } as SearchSelectOption)),
        hasMore: res.data.length === 8
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

  openUnitCreate(context: 'yield' | 'ingredient') {
    this.unitCreateFor.set(context);
    this.unitCreateOpen.set(true);
  }

  onUnitCreated(unit: Unit) {
    const opt: SearchSelectOption = { value: unit.id, label: `${unit.name} (${unit.abbreviation})` };
    if (this.unitCreateFor() === 'yield') {
      this.recipeGroup.get('yieldUnitId')!.setValue(unit.id);
      this.initialYieldUnitOption.set(opt);
    } else {
      const i = this.editingIngredientIndex();
      if (i !== null) {
        this.onIngredientUnitChange(i, opt);
      }
    }
    this.unitCreateOpen.set(false);
    this.cdr.markForCheck();
  }
}
