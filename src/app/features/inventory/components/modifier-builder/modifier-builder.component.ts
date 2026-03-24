import {
  Component, Input, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { trigger, transition, style, animate, query, group } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormArray, FormBuilder, FormGroup,
  ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators
} from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideTrash2, lucideX, lucideLink,
  lucidePencil, lucideChevronLeft, lucideAlertCircle
} from '@ng-icons/lucide';
import {
  Subject, Subscription, debounceTime, distinctUntilChanged,
  switchMap, of, takeUntil
} from 'rxjs';
import { ProductService } from '../../services/product.service';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { ToggleSwitchComponent } from '../../../../shared/components/ui/toggle-switch/toggle-switch';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';

@Component({
  selector: 'app-modifier-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent,
    FieldInputComponent, ToggleSwitchComponent, DrawerComponent, FormButtonComponent],
  providers: [
    provideIcons({
      lucidePlus, lucideTrash2, lucideX, lucideLink,
      lucidePencil, lucideChevronLeft, lucideAlertCircle
    })
  ],
  templateUrl: './modifier-builder.component.html',
  styleUrl: './modifier-builder.component.scss',
  animations: [
    trigger('slideView', [
      // group → option (slide left)
      transition('group => option', [
        style({ position: 'relative', overflow: 'hidden' }),
        query(':enter', [style({ position: 'absolute', width: '100%', transform: 'translateX(100%)', opacity: 0 })], { optional: true }),
        query(':leave', [style({ position: 'absolute', width: '100%' })], { optional: true }),
        group([
          query(':leave', [animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(-30%)', opacity: 0 }))], { optional: true }),
          query(':enter', [animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)', opacity: 1 }))], { optional: true }),
        ])
      ]),
      // option → group (slide right)
      transition('option => group', [
        style({ position: 'relative', overflow: 'hidden' }),
        query(':enter', [style({ position: 'absolute', width: '100%', transform: 'translateX(-30%)', opacity: 0 })], { optional: true }),
        query(':leave', [style({ position: 'absolute', width: '100%' })], { optional: true }),
        group([
          query(':leave', [animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(100%)', opacity: 0 }))], { optional: true }),
          query(':enter', [animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)', opacity: 1 }))], { optional: true }),
        ])
      ]),
    ])
  ]
})
export class ModifierBuilderComponent implements OnInit, OnDestroy {
  @Input({ required: true }) formArray!: FormArray;

  private fb         = inject(FormBuilder);
  private productSvc = inject(ProductService);
  private cdr        = inject(ChangeDetectorRef);
  private destroy$   = new Subject<void>();
  private optSearch$ = new Subject<string>();
  private requiredSub?: Subscription;
  private isDefaultSub?: Subscription;

  // ── Drawer state ──────────────────────────────────────────────────────────────
  drawerOpen        = signal(false);
  drawerView        = signal<'group' | 'option'>('group');
  editingGroupIndex = signal<number | null>(null);
  editingOptionOi   = signal<number | null>(null);

  // Draft para opciones nuevas (no se añaden al FormArray hasta guardar)
  draftOption  = signal<FormGroup | null>(null);
  isNewOption  = signal(false);

  // Variant search
  activeOptKey = signal<string | null>(null);
  optQuery     = signal('');
  optResults   = signal<any[]>([]);
  optSearching = signal(false);

  // ── Validators ────────────────────────────────────────────────────────────────

  private atLeastOneOption: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null =>
    (ctrl as FormArray).length > 0 ? null : { noOptions: true };

  private minMaxValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const min = Number(group.get('minSelections')?.value ?? 0);
    const max = Number(group.get('maxSelections')?.value ?? 1);
    return min > max ? { minExceedsMax: true } : null;
  };

  // ── Computed getters ──────────────────────────────────────────────────────────

  get editingGroup(): FormGroup | null {
    const i = this.editingGroupIndex();
    if (i === null || i >= this.formArray.length) return null;
    return this.asGroup(this.formArray.at(i));
  }

  get editingOption(): FormGroup | null {
    const gi = this.editingGroupIndex();
    const oi = this.editingOptionOi();
    if (gi === null || oi === null) return null;
    const options = this.getOptions(this.formArray.at(gi));
    if (oi >= options.length) return null;
    return this.asGroup(options.at(oi));
  }

  /** Opción activa: draft (nueva) o existente */
  get currentOption(): FormGroup | null {
    return this.isNewOption() ? this.draftOption() : this.editingOption;
  }

  get drawerTitle(): string {
    if (this.drawerView() === 'option') {
      return this.currentOption?.get('name')?.value || 'Nueva opción';
    }
    return this.editingGroup?.get('name')?.value || 'Grupo de modificadores';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit() {
    this.formArray.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    this.optSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) {
          this.optResults.set([]);
          this.optSearching.set(false);
          return of([]);
        }
        this.optSearching.set(true);
        return this.productSvc.searchVariants(query, undefined, ['PHYSICAL'], true);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: data => { this.optSearching.set(false); this.optResults.set(data); },
      error: () => { this.optSearching.set(false); this.optResults.set([]); }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.requiredSub?.unsubscribe();
    this.isDefaultSub?.unsubscribe();
  }

  // ── Drawer grupo ──────────────────────────────────────────────────────────────

  openGroupDrawer(index: number) {
    this.requiredSub?.unsubscribe();
    this.isDefaultSub?.unsubscribe();

    this.editingGroupIndex.set(index);
    this.drawerView.set('group');
    this.editingOptionOi.set(null);
    this.draftOption.set(null);
    this.isNewOption.set(false);
    this.drawerOpen.set(true);

    const grp = this.formArray.at(index);

    if (!grp.hasValidator(this.minMaxValidator)) {
      grp.addValidators(this.minMaxValidator);
      grp.updateValueAndValidity({ emitEvent: false });
    }
    const opts = this.getOptions(grp);
    if (!opts.hasValidator(this.atLeastOneOption)) {
      opts.addValidators(this.atLeastOneOption);
      opts.updateValueAndValidity({ emitEvent: false });
    }

    this.requiredSub = grp.get('required')!.valueChanges
      .subscribe(() => this.onRequiredChange(index));
  }

  /** Listo en vista grupo: valida, bloquea si hay errores */
  doneGroup() {
    const grp = this.editingGroup;
    if (!grp) { this._closeDrawer(); return; }
    grp.markAllAsTouched();
    this.cdr.markForCheck();
    if (grp.invalid) return;
    this._closeDrawer();
  }

  /** X del drawer: cierra sin validar */
  closeGroupDrawer() {
    this._closeDrawer();
  }

  private _closeDrawer() {
    this.drawerOpen.set(false);
    this.drawerView.set('group');
    this.editingGroupIndex.set(null);
    this.editingOptionOi.set(null);
    this.draftOption.set(null);
    this.isNewOption.set(false);
    this.requiredSub?.unsubscribe();
    this.requiredSub = undefined;
    this.isDefaultSub?.unsubscribe();
    this.isDefaultSub = undefined;
    this.activeOptKey.set(null);
    this.optResults.set([]);
  }

  // ── Drawer opción ─────────────────────────────────────────────────────────────

  openOptionView(oi: number) {
    this.isDefaultSub?.unsubscribe();
    this.editingOptionOi.set(oi);
    this.isNewOption.set(false);
    this.draftOption.set(null);
    this.drawerView.set('option');
    this.activeOptKey.set(null);
    this.optResults.set([]);

    const gi  = this.editingGroupIndex()!;
    const opt = this.asGroup(this.getOptions(this.formArray.at(gi)).at(oi));
    this._setupOptionSubscriptions(opt, gi, oi);
  }

  /** Añadir opción: crea draft, no toca el FormArray todavía */
  startNewOption(groupIndex: number) {
    this.isDefaultSub?.unsubscribe();

    const sortOrder = this.getOptions(this.formArray.at(groupIndex)).length;
    const draft = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      priceAdjustment: [0],
      variantId: [null],
      variantName: [''],
      isDefault: [false],
      sortOrder: [sortOrder]
    });

    this.draftOption.set(draft);
    this.isNewOption.set(true);
    this.editingOptionOi.set(null);
    this.drawerView.set('option');
    this.activeOptKey.set(null);
    this.optResults.set([]);

    this._setupOptionSubscriptions(draft, groupIndex, null);
  }

  private _setupOptionSubscriptions(opt: FormGroup, gi: number, oi: number | null) {
    // Solo una opción predeterminada a la vez
    this.isDefaultSub = opt.get('isDefault')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        if (val) {
          this.getOptions(this.formArray.at(gi)).controls.forEach((ctrl, idx) => {
            if (idx !== oi) ctrl.get('isDefault')!.setValue(false, { emitEvent: false });
          });
          // Si hay un draft y el existing se activa, no aplica al revés
        }
      });
  }

  /** Guardar opción: valida — si nueva la añade al array, si existente solo vuelve */
  doneOption() {
    const opt = this.currentOption;
    if (opt) {
      opt.markAllAsTouched();
      this.cdr.markForCheck();
      if (opt.invalid) return;
    }

    if (this.isNewOption() && opt) {
      const gi = this.editingGroupIndex()!;
      this.getOptions(this.formArray.at(gi)).push(opt);
    }

    this._backToGroup();
  }

  /** Volver: libre, sin validar (para nueva opción descarta el draft) */
  backToGroup() {
    this._backToGroup();
  }

  private _backToGroup() {
    this.isDefaultSub?.unsubscribe();
    this.isDefaultSub = undefined;
    this.draftOption.set(null);
    this.isNewOption.set(false);
    this.drawerView.set('group');
    this.editingOptionOi.set(null);
    this.activeOptKey.set(null);
    this.optResults.set([]);
  }

  // ── Form helpers ──────────────────────────────────────────────────────────────

  asGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  getOptions(grpCtrl: AbstractControl): FormArray {
    return grpCtrl.get('options') as FormArray;
  }

  addGroup() {
    const index = this.formArray.length;
    this.formArray.push(this.fb.group(
      {
        name: ['', [Validators.required, Validators.maxLength(100)]],
        minSelections: [0, [Validators.min(0)]],
        maxSelections: [1, [Validators.required, Validators.min(1)]],
        required: [false],
        sortOrder: [index],
        options: this.fb.array([], [this.atLeastOneOption])
      },
      { validators: [this.minMaxValidator] }
    ));
    this.openGroupDrawer(index);
  }

  removeGroup(index: number) {
    if (this.editingGroupIndex() === index) this._closeDrawer();
    this.formArray.removeAt(index);
  }

  onRequiredChange(gi: number) {
    const grp = this.formArray.at(gi);
    if (grp.get('required')?.value && (grp.get('minSelections')?.value ?? 0) < 1) {
      grp.get('minSelections')!.setValue(1);
    }
  }

  removeOption(groupIndex: number, optionIndex: number) {
    if (!this.isNewOption() && this.editingOptionOi() === optionIndex) {
      this._backToGroup();
    }
    this.getOptions(this.formArray.at(groupIndex)).removeAt(optionIndex);
  }

  // ── Variant search (opera sobre currentOption) ────────────────────────────────

  get currentOptKey(): string {
    return this.isNewOption()
      ? `${this.editingGroupIndex()}:new`
      : `${this.editingGroupIndex()}:${this.editingOptionOi()}`;
  }

  openOptSearch() {
    this.activeOptKey.set(this.currentOptKey);
    this.optQuery.set('');
    this.optResults.set([]);
  }

  onOptSearch(event: Event) {
    const q = (event.target as HTMLInputElement).value;
    this.optQuery.set(q);
    this.optSearch$.next(q);
  }

  onOptBlur() {
    setTimeout(() => { this.activeOptKey.set(null); this.optResults.set([]); }, 180);
  }

  selectVariant(r: any) {
    this.currentOption?.patchValue({
      variantId: r.variantId,
      variantName: `${r.productName}${r.variantName !== r.productName ? ' — ' + r.variantName : ''}`,
      priceAdjustment: r.salePrice ?? 0,
    });
    this.activeOptKey.set(null);
    this.optResults.set([]);
  }

  clearVariant() {
    this.currentOption?.patchValue({ variantId: null, variantName: '' });
  }
}
