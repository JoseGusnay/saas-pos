import { Component, EventEmitter, Output, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { BranchService } from '../../../../core/services/branch.service';
import { FiscalStateService } from '../../../../core/services/fiscal-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Branch, CreatePuntoEmisionInline } from '../../../../core/models/branch.models';
import { TIPO_COMPROBANTE_LABELS, TipoComprobante } from '../../../../core/models/fiscal.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2, lucideChevronDown, lucideChevronRight } from '@ng-icons/lucide';

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ lucidePlus, lucideTrash2, lucideChevronDown, lucideChevronRight })],
  templateUrl: './branch-form.html',
  styleUrls: ['./branch-form.scss']
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
      const dirCtrl = this.branchForm.get('dirEstablecimiento');

      if (isFiscal) {
        codigoCtrl?.setValidators([Validators.required, Validators.pattern(/^\d{3}$/)]);
        dirCtrl?.setValidators([Validators.required]);
        this.puntosEmisionArray.enable({ emitEvent: false });
      } else {
        codigoCtrl?.setValidators(null);
        dirCtrl?.setValidators(null);
        this.puntosEmisionArray.disable({ emitEvent: false });
      }
      codigoCtrl?.updateValueAndValidity({ emitEvent: false });
      dirCtrl?.updateValueAndValidity({ emitEvent: false });
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
    dirEstablecimiento:      [''],
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
      address: branch.address,
      phone: branch.phone,
      city: branch.city,
      manager: branch.manager,
      isActive: branch.isActive,
      isMain: branch.isMain,
      codigoEstablecimiento:   branch.codigoEstablecimiento  ?? '',
      dirEstablecimiento:      branch.dirEstablecimiento     ?? '',
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
      dirEstablecimiento: '',
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

    const payload = { ...formValue, puntosEmision: rawPuntos };

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
