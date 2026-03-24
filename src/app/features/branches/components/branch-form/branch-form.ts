import { Component, EventEmitter, Output, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { BranchService } from '../../../../core/services/branch.service';
import { FiscalStateService } from '../../../../core/services/fiscal-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Branch, CreatePuntoEmisionInline } from '../../../../core/models/branch.models';
import { TIPO_COMPROBANTE_LABELS, TipoComprobante } from '../../../../core/models/fiscal.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2, lucideChevronDown, lucideChevronRight } from '@ng-icons/lucide';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { AddRowButtonComponent } from '../../../../shared/components/ui/add-row-button/add-row-button';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIconComponent, FieldInputComponent, AddRowButtonComponent, FieldToggleComponent],
  providers: [provideIcons({ lucidePlus, lucideTrash2, lucideChevronDown, lucideChevronRight })],
  templateUrl: './branch-form.html',
  styleUrls: ['./branch-form.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: 0, opacity: 0 })),
      ]),
    ]),
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, transform: 'translateY(-8px)' })),
      ]),
    ]),
  ],
})
export class BranchFormComponent {
  private fb = inject(FormBuilder);
  private branchService = inject(BranchService);
  private fiscalState = inject(FiscalStateService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  editingBranchId = signal<string | null>(null);
  expandedPuntos = signal<Set<number>>(new Set());
  readonly facturacionElectronica = computed(() => this.fiscalState.facturacionElectronica());

  readonly TIPOS = Object.entries(TIPO_COMPROBANTE_LABELS) as [TipoComprobante, string][];

  constructor() {
    effect(() => {
      const isFiscal = this.facturacionElectronica();
      const codigoCtrl = this.branchForm.get('codigoEstablecimiento');
      const addressCtrl = this.branchForm.get('address');

      if (isFiscal) {
        codigoCtrl?.setValidators([Validators.required, Validators.pattern(/^\d{3}$/)]);
        addressCtrl?.setValidators([Validators.required]);
        this.puntosEmisionArray.enable({ emitEvent: false });
      } else {
        codigoCtrl?.setValidators(null);
        addressCtrl?.setValidators(null);
        this.puntosEmisionArray.disable({ emitEvent: false });
      }
      codigoCtrl?.updateValueAndValidity({ emitEvent: false });
      addressCtrl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  branchForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    address: [''],
    phone: [''],
    city: [''],
    manager: [''],
    isActive: [true],
    isMain: [false],
    codigoEstablecimiento:   ['', [Validators.maxLength(3)]],
    nombreComercialSucursal: [''],
    puntosEmision: this.fb.array([]),
  });

  get puntosEmisionArray(): FormArray {
    return this.branchForm.get('puntosEmision') as FormArray;
  }

  get isEditing(): boolean {
    return !!this.editingBranchId();
  }

  isPuntoExisting(index: number): boolean {
    return !!(this.puntosEmisionArray.at(index) as FormGroup).get('isExisting')?.value;
  }

  isPuntoExpanded(index: number): boolean {
    return this.expandedPuntos().has(index);
  }

  togglePunto(index: number) {
    this.expandedPuntos.update(set => {
      const next = new Set(set);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  getSecuencialesArray(index: number): FormArray {
    return (this.puntosEmisionArray.at(index) as FormGroup).get('secuenciales') as FormArray;
  }

  private createPuntoGroup(opts: {
    codigoPuntoEmision?: string;
    descripcion?: string;
    isExisting?: boolean;
    secuenciales?: { tipoComprobante: string; ultimoNumero: number }[];
  } = {}): FormGroup {
    const secMap = new Map((opts.secuenciales ?? []).map(s => [s.tipoComprobante, s.ultimoNumero]));
    return this.fb.group({
      codigoPuntoEmision: [opts.codigoPuntoEmision ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      descripcion: [opts.descripcion ?? ''],
      isExisting: [opts.isExisting ?? false],
      secuenciales: this.fb.array(
        this.TIPOS.map(([tipo, label]) =>
          this.fb.group({
            tipoComprobante: [tipo],
            label: [label],
            ultimoNumero: [secMap.get(tipo) ?? 0, [Validators.required, Validators.min(0)]],
          })
        )
      ),
    });
  }

  addPuntoEmision() {
    this.puntosEmisionArray.push(this.createPuntoGroup());
  }

  removePuntoEmision(index: number) {
    this.puntosEmisionArray.removeAt(index);
    this.expandedPuntos.update(set => {
      const next = new Set<number>();
      set.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  }

  isSubmitting = false;

  setBranch(branch: Branch) {
    this.editingBranchId.set(branch.id);
    this.branchForm.patchValue({
      name: branch.name,
      address: branch.dirEstablecimiento || branch.address || '',
      phone: branch.phone,
      city: branch.city,
      manager: branch.manager,
      isActive: branch.isActive,
      isMain: branch.isMain,
      codigoEstablecimiento:   branch.codigoEstablecimiento  ?? '',
      nombreComercialSucursal: branch.nombreComercialSucursal ?? '',
    });
    this.puntosEmisionArray.clear();
    this.expandedPuntos.set(new Set());
    const puntos = Array.isArray(branch.puntosEmision) ? branch.puntosEmision : [];
    for (const p of puntos) {
      this.puntosEmisionArray.push(this.createPuntoGroup({
        codigoPuntoEmision: p.codigoPuntoEmision,
        descripcion: p.descripcion ?? '',
        isExisting: true,
        secuenciales: (p.secuenciales ?? []).map(s => ({ tipoComprobante: s.tipoComprobante, ultimoNumero: s.ultimoNumero })),
      }));
    }
    this.branchForm.markAsPristine();
  }

  resetForm() {
    this.editingBranchId.set(null);
    this.expandedPuntos.set(new Set());
    this.puntosEmisionArray.clear();
    this.branchForm.reset({
      isActive: true,
      isMain: false,
      codigoEstablecimiento: '',
      nombreComercialSucursal: '',
    });
  }

  onSubmit() {
    if (this.branchForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const { puntosEmision: _, ...formValue } = this.branchForm.value;
    const branchId = this.editingBranchId();

    const rawPuntos: CreatePuntoEmisionInline[] = this.facturacionElectronica()
      ? this.puntosEmisionArray.getRawValue()
          .filter((p: any) => p.codigoPuntoEmision)
          .map(({ codigoPuntoEmision, descripcion, secuenciales }: any) => ({
            codigoPuntoEmision,
            ...(descripcion ? { descripcion } : {}),
            secuenciales: secuenciales.map(({ tipoComprobante, ultimoNumero }: any) => ({ tipoComprobante, ultimoNumero })),
          }))
      : [];

    const codigos = rawPuntos.map(p => p.codigoPuntoEmision);
    if (new Set(codigos).size !== codigos.length) {
      this.toastService.error('No puede haber puntos de emisión con el mismo código');
      this.isSubmitting = false;
      return;
    }

    const payload = {
      ...formValue,
      ...(this.facturacionElectronica() ? { dirEstablecimiento: formValue.address } : {}),
      puntosEmision: rawPuntos,
    };

    const request$ = branchId
      ? this.branchService.update(branchId, payload)
      : this.branchService.create(payload);

    request$.subscribe({
      next: () => {
        this.saved.emit();
        this.isSubmitting = false;
        this.resetForm();
      },
      error: (err) => {
        console.error('Error saving branch:', err);
        const isEditing = !!this.editingBranchId();
        this.toastService.error(`Error al ${isEditing ? 'actualizar' : 'crear'} la sucursal`);
        this.isSubmitting = false;
      }
    });
  }

  onCancel() {
    this.cancelled.emit();
  }

  formatSecuencial(value: any): string {
    const n = Number(value) || 0;
    return String(n).padStart(9, '0');
  }

  hasUnsavedChanges(): boolean {
    return this.branchForm.dirty;
  }
}
