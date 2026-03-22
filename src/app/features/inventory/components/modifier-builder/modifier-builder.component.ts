import {
  Component, Input, OnInit, OnDestroy, inject, signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormArray, FormBuilder, FormGroup,
  ReactiveFormsModule, Validators
} from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideTrash2, lucideChevronDown, lucideChevronUp,
  lucideX, lucideSearch
} from '@ng-icons/lucide';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';

@Component({
  selector: 'app-modifier-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, FieldInputComponent],
  providers: [
    provideIcons({ lucidePlus, lucideTrash2, lucideChevronDown, lucideChevronUp, lucideX, lucideSearch })
  ],
  templateUrl: './modifier-builder.component.html',
  styleUrl: './modifier-builder.component.scss'
})
export class ModifierBuilderComponent implements OnInit, OnDestroy {
  @Input({ required: true }) formArray!: FormArray;

  private fb = inject(FormBuilder);
  private productSvc = inject(ProductService);
  private destroy$ = new Subject<void>();
  private optSearch$ = new Subject<string>();

  // Track which groups are expanded (all open by default when added)
  private openGroups = signal<Set<number>>(new Set());

  // Variant search state for modifier options
  activeOptKey = signal<string | null>(null);   // "gi:oi"
  optQuery = signal('');
  optResults = signal<any[]>([]);
  optSearching = signal(false);

  ngOnInit() {
    // Abrir todos los grupos pre-existentes (modo edición)
    if (this.formArray.length > 0) {
      const s = new Set<number>();
      for (let i = 0; i < this.formArray.length; i++) s.add(i);
      this.openGroups.set(s);
    }

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

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  openOptSearch(gi: number, oi: number) {
    this.activeOptKey.set(`${gi}:${oi}`);
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

  selectVariant(r: any, gi: number, oi: number) {
    const opt = this.getOptions(this.formArray.at(gi)).at(oi);
    opt.patchValue({
      variantId: r.variantId,
      variantName: `${r.productName} — ${r.variantName !== r.productName ? r.variantName : ''}`.trim().replace(/—\s*$/, ''),
      priceAdjustment: r.salePrice,
    });
    this.activeOptKey.set(null);
    this.optResults.set([]);
  }

  clearVariant(gi: number, oi: number) {
    this.getOptions(this.formArray.at(gi)).at(oi).patchValue({ variantId: null, variantName: '' });
  }

  isOpen(index: number): boolean {
    return this.openGroups().has(index);
  }

  toggleGroup(index: number) {
    const s = new Set(this.openGroups());
    if (s.has(index)) s.delete(index);
    else s.add(index);
    this.openGroups.set(s);
  }

  asGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  getOptions(grpCtrl: AbstractControl): FormArray {
    return grpCtrl.get('options') as FormArray;
  }

  addGroup() {
    const index = this.formArray.length;
    this.formArray.push(this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      minSelections: [0, [Validators.min(0)]],
      maxSelections: [1, [Validators.required, Validators.min(1)]],
      required: [false],
      sortOrder: [index],
      options: this.fb.array([])
    }));
    // Auto-open the new group
    const s = new Set(this.openGroups());
    s.add(index);
    this.openGroups.set(s);
  }

  removeGroup(index: number) {
    this.formArray.removeAt(index);
    // Re-map open groups: shift indices above removed down by 1
    const s = new Set<number>();
    this.openGroups().forEach(i => {
      if (i < index) s.add(i);
      else if (i > index) s.add(i - 1);
    });
    this.openGroups.set(s);
  }

  onRequiredChange(gi: number) {
    const grp = this.formArray.at(gi);
    if (grp.get('required')?.value && (grp.get('minSelections')?.value ?? 0) < 1) {
      grp.get('minSelections')!.setValue(1);
    }
  }

  addOption(groupIndex: number) {
    const options = this.getOptions(this.formArray.at(groupIndex));
    options.push(this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      priceAdjustment: [0],
      variantId: [null],
      variantName: [''],
      isDefault: [false],
      sortOrder: [options.length]
    }));
  }

  removeOption(groupIndex: number, optionIndex: number) {
    this.getOptions(this.formArray.at(groupIndex)).removeAt(optionIndex);
  }
}
