import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2, lucideFileText, lucideShieldCheck,
  lucideCheckCircle2, lucideAlertTriangle,
  lucideSave, lucideInfo,
} from '@ng-icons/lucide';

import { FiscalService } from '../../../../core/services/fiscal.service';
import { FiscalStateService } from '../../../../core/services/fiscal-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormCardComponent } from '../../../../shared/components/ui/form-card/form-card';
import { FileUploadComponent } from '../../../../shared/components/ui/file-upload/file-upload';
import { SegmentedToggleComponent } from '../../../../shared/components/ui/segmented-toggle/segmented-toggle';
import { EmpresaFiscal } from '../../../../core/models/fiscal.models';

/**
 * Validador de RUC ecuatoriano.
 * Verifica: 13 dígitos, provincia válida (01-24), tercer dígito válido,
 * sufijo 001, y dígito verificador (módulo 10 para personas naturales,
 * módulo 11 para sociedades y entidades públicas).
 */
function rucValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value?.trim();
  if (!value) return null; // required se maneja aparte

  if (!/^\d{13}$/.test(value)) return { ruc: 'Debe tener exactamente 13 dígitos numéricos' };

  const provincia = parseInt(value.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) return { ruc: 'Código de provincia inválido (01-24)' };

  if (value.substring(10) !== '001') return { ruc: 'Los últimos 3 dígitos deben ser 001' };

  const tercerDigito = parseInt(value[2], 10);
  const digits = value.split('').map(Number);

  if (tercerDigito >= 0 && tercerDigito <= 5) {
    // Persona natural — módulo 10 sobre los primeros 10 dígitos
    const coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let prod = digits[i] * coefs[i];
      if (prod >= 10) prod -= 9;
      sum += prod;
    }
    const check = (10 - (sum % 10)) % 10;
    if (check !== digits[9]) return { ruc: 'Dígito verificador inválido' };
  } else if (tercerDigito === 6) {
    // Entidad pública — módulo 11 sobre los primeros 9 dígitos
    const coefs = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += digits[i] * coefs[i];
    const check = 11 - (sum % 11);
    const verifier = check === 11 ? 0 : check;
    if (verifier !== digits[8]) return { ruc: 'Dígito verificador inválido' };
  } else if (tercerDigito === 9) {
    // Sociedad privada — módulo 11 sobre los primeros 10 dígitos
    const coefs = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += digits[i] * coefs[i];
    const check = 11 - (sum % 11);
    const verifier = check === 11 ? 0 : check;
    if (verifier !== digits[9]) return { ruc: 'Dígito verificador inválido' };
  } else {
    return { ruc: 'Tercer dígito inválido' };
  }

  return null;
}

@Component({
  selector: 'app-empresa-fiscal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, NgIconComponent,
    FormButtonComponent, SpinnerComponent, FieldInputComponent,
    FieldToggleComponent, ModalComponent, FormCardComponent,
    FileUploadComponent, SegmentedToggleComponent,
  ],
  providers: [provideIcons({
    lucideBuilding2, lucideFileText, lucideShieldCheck,
    lucideCheckCircle2, lucideAlertTriangle,
    lucideSave, lucideInfo,
  })],
  template: `
    <div class="ef-page">

      <!-- Header -->
      <div class="ef-header">
        <div class="ef-header__left">
          <h1 class="ef-title">Empresa Fiscal</h1>
          <p class="ef-subtitle">Datos tributarios y configuración SRI de tu empresa</p>
        </div>
        <app-form-button
          [label]="empresa() ? 'Guardar Cambios' : 'Configurar Empresa'"
          loadingLabel="Guardando..."
          icon="lucideSave"
          type="button"
          [fullWidth]="false"
          [loading]="isSaving()"
          [disabled]="isSaving() || isLoading()"
          (click)="save()"
        ></app-form-button>
      </div>

      @if (isLoading()) {
        <div class="ef-loading"><app-spinner></app-spinner></div>
      } @else {

        <!-- Ambiente banner -->
        @if (fiscalForm.value.facturacionElectronica) {
          @if (fiscalForm.value.ambiente === 2) {
            <div class="env-banner env-banner--prod">
              <ng-icon name="lucideAlertTriangle" size="16"></ng-icon>
              <span>Ambiente de <strong>PRODUCCIÓN</strong> — Los comprobantes emitidos serán válidos ante el SRI</span>
            </div>
          } @else {
            <div class="env-banner env-banner--test">
              <ng-icon name="lucideInfo" size="16"></ng-icon>
              <span>Ambiente de <strong>PRUEBAS</strong> — Los comprobantes no tienen validez tributaria</span>
            </div>
          }
        }

        <form [formGroup]="fiscalForm" class="ef-grid" (ngSubmit)="save()">

          <!-- Card: Datos tributarios -->
          <app-form-card title="Datos Tributarios" icon="lucideBuilding2">

              <div class="ef-row ef-row--2">
                <app-field-input
                  label="RUC"
                  formControlName="ruc"
                  placeholder="1799999999001"
                  hint="13 dígitos, termina en 001"
                  [required]="true"
                  [maxlength]="13"
                ></app-field-input>
                <app-field-input
                  label="Razón Social"
                  formControlName="razonSocial"
                  placeholder="COMERCIALIZADORA ANDINA S.A."
                  [required]="true"
                ></app-field-input>
              </div>

              <div class="ef-row ef-row--2">
                <app-field-input
                  label="Nombre Comercial"
                  formControlName="nombreComercial"
                  placeholder="Nombre comercial (opcional)"
                  [optional]="true"
                ></app-field-input>
                <app-field-input
                  label="N° Contribuyente Especial"
                  formControlName="contribuyenteEspecial"
                  placeholder="Nro. Resolución o vacío"
                  [optional]="true"
                ></app-field-input>
              </div>

              <app-field-input
                label="Dirección Matriz"
                formControlName="dirMatriz"
                placeholder="Av. Principal 123, Ciudad, Ecuador"
                [required]="true"
              ></app-field-input>

              <div class="ef-row ef-row--2">
                <div class="ef-field">
                  <span class="ef-label">FACTURACIÓN ELECTRÓNICA</span>
                  <app-field-toggle
                    [label]="fiscalForm.value.facturacionElectronica ? 'ACTIVA' : 'INACTIVA'"
                    [description]="fiscalForm.value.facturacionElectronica ? 'Comprobantes electrónicos habilitados' : 'Solo datos básicos de sucursales'"
                    formControlName="facturacionElectronica"
                  ></app-field-toggle>
                </div>
                <div class="ef-field">
                  <span class="ef-label">OBLIGADO A LLEVAR CONTABILIDAD</span>
                  <app-field-toggle
                    [label]="fiscalForm.value.obligadoContabilidad ? 'SÍ' : 'NO'"
                    formControlName="obligadoContabilidad"
                  ></app-field-toggle>
                </div>
              </div>

              <div class="ef-field">
                <span class="ef-label">RÉGIMEN RIMPE</span>
                <app-segmented-toggle
                  variant="pill"
                  [options]="rimpeOptions"
                  [value]="fiscalForm.value.regimenRimpe ?? ''"
                  (valueChange)="fiscalForm.patchValue({ regimenRimpe: $event || null })"
                ></app-segmented-toggle>
              </div>

          </app-form-card>

          <!-- Cards condicionales: solo con facturación electrónica -->
          @if (fiscalForm.value.facturacionElectronica) {

            <!-- Card: Configuración SRI -->
            <app-form-card title="Configuración SRI" icon="lucideFileText">

                <div class="ef-field">
                  <span class="ef-label">AMBIENTE</span>
                  <div class="amb-toggle">
                    <button type="button" class="amb-opt"
                      [class.amb-opt--test]="fiscalForm.value.ambiente === 1"
                      (click)="fiscalForm.patchValue({ ambiente: 1 })">
                      <span class="amb-dot amb-dot--test"></span>
                      Pruebas
                    </button>
                    <button type="button" class="amb-opt"
                      [class.amb-opt--prod]="fiscalForm.value.ambiente === 2"
                      (click)="setProduccion()">
                      <span class="amb-dot amb-dot--prod"></span>
                      Producción
                    </button>
                  </div>
                  <span class="ef-hint">
                    @if (fiscalForm.value.ambiente === 1) {
                      Los comprobantes no tienen validez tributaria ante el SRI
                    } @else {
                      Los comprobantes emitidos son documentos tributarios válidos
                    }
                  </span>
                </div>

                <div class="ef-field">
                  <span class="ef-label">TIPO DE EMISIÓN</span>
                  <div class="readonly-field">
                    <span>1 — Normal (en línea)</span>
                    <span class="readonly-badge">Fijo por SRI</span>
                  </div>
                </div>

            </app-form-card>

            <!-- Card: Certificado digital -->
            <app-form-card title="Certificado Digital (.P12)" icon="lucideShieldCheck">

                @if (empresa()?.certificadoP12) {
                  <div class="cert-status cert-status--ok">
                    <ng-icon name="lucideCheckCircle2" size="18"></ng-icon>
                    <div>
                      <span class="cert-status__title">Certificado configurado</span>
                      <span class="cert-status__sub">Actualiza el archivo para reemplazarlo</span>
                    </div>
                  </div>
                } @else {
                  <div class="cert-status cert-status--empty">
                    <ng-icon name="lucideAlertTriangle" size="18"></ng-icon>
                    <div>
                      <span class="cert-status__title">Sin certificado</span>
                      <span class="cert-status__sub">Requerido para firmar comprobantes electrónicos</span>
                    </div>
                  </div>
                }

                <app-file-upload
                  label="Archivo .P12"
                  accept=".p12"
                  placeholder="Haz clic para seleccionar el archivo .p12"
                  (base64Ready)="p12Base64.set($event)"
                ></app-file-upload>

                <app-field-input
                  label="Contraseña del Certificado"
                  formControlName="claveP12"
                  type="password"
                  placeholder="Contraseña del archivo .p12"
                ></app-field-input>

            </app-form-card>

          }

        </form>

        <!-- Modal: Desactivar facturación -->
        <app-modal
          [isOpen]="showDisableFiscalConfirm()"
          title="¿Desactivar facturación electrónica?"
          size="sm"
          (close)="cancelDisableFacturacion()"
        >
          <div modalBody>
            <p class="modal-msg">Los campos SRI de las sucursales quedarán ocultos pero los datos no se eliminarán. Podrás reactivarla en cualquier momento.</p>
          </div>
          <div modalFooter class="modal-footer-actions">
            <app-form-button
              label="Cancelar"
              variant="ghost"
              type="button"
              [fullWidth]="false"
              (click)="cancelDisableFacturacion()"
            ></app-form-button>
            <app-form-button
              label="Sí, desactivar"
              variant="danger"
              type="button"
              [fullWidth]="false"
              (click)="confirmDisableFacturacion()"
            ></app-form-button>
          </div>
        </app-modal>

        <!-- Modal: Cambiar a Producción -->
        <app-modal
          [isOpen]="showProdConfirm()"
          title="¿Cambiar a Producción?"
          size="sm"
          (close)="showProdConfirm.set(false)"
        >
          <div modalBody>
            <p class="modal-msg">Los comprobantes emitidos serán documentos tributarios válidos ante el SRI. Asegúrate de tener el certificado digital vigente configurado.</p>
          </div>
          <div modalFooter class="modal-footer-actions">
            <app-form-button
              label="Cancelar"
              variant="ghost"
              type="button"
              [fullWidth]="false"
              (click)="showProdConfirm.set(false)"
            ></app-form-button>
            <app-form-button
              label="Sí, cambiar a Producción"
              variant="danger"
              type="button"
              [fullWidth]="false"
              (click)="confirmProduccion()"
            ></app-form-button>
          </div>
        </app-modal>

      }
    </div>
  `,
  styles: [`
    .ef-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 1200px; margin: 0 auto; padding: 24px 32px 32px; }
    @media (max-width: 768px) { .ef-page { padding: 20px 16px 24px; } }

    /* Header */
    .ef-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
      flex-wrap: wrap;
    }
    .ef-header__left { flex: 1; min-width: 0; }
    @media (max-width: 768px) {
      .ef-header { gap: 0.75rem; }
      .ef-header__left { flex: unset; width: 100%; }
      .ef-header > app-form-button { margin-left: auto; }
    }
    .ef-title { font-size: 1.5rem; font-weight: 800; color: var(--color-text-main); margin: 0; letter-spacing: -0.02em; }
    .ef-subtitle { font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0.25rem 0 0; }
    .ef-loading { display: flex; justify-content: center; padding: 4rem; }

    /* Banners */
    .env-banner {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.75rem 1rem; border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }
    .env-banner--test {
      background: var(--color-info-bg, rgba(59,130,246,0.08));
      color: var(--color-info-text, #3b82f6);
      border: 1px solid var(--color-info-border, rgba(59,130,246,0.2));
    }
    .env-banner--prod {
      background: var(--color-danger-bg, rgba(239,68,68,0.08));
      color: var(--color-danger-text, #ef4444);
      border: 1px solid var(--color-danger-border, rgba(239,68,68,0.2));
    }

    /* Grid */
    .ef-grid { display: flex; flex-direction: column; gap: 1.25rem; }

    /* Layout */
    .ef-row { display: grid; gap: 1rem; }
    .ef-row--2 { grid-template-columns: 1fr 1fr; }
    @media (max-width: 640px) { .ef-row--2 { grid-template-columns: 1fr; } }

    .ef-field { display: flex; flex-direction: column; gap: 6px; }
    .ef-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .ef-hint { font-size: 11px; color: var(--color-text-muted); }

    /* Ambiente toggle */
    .amb-toggle { display: flex; gap: 0.5rem; }
    .amb-opt {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.625rem; border-radius: var(--radius-md); cursor: pointer;
      border: 1.5px solid var(--color-border-light);
      background: var(--color-bg-surface); color: var(--color-text-muted);
      font-size: var(--font-size-sm); font-weight: 600; font-family: inherit;
      transition: all var(--transition-base);
    }
    .amb-dot { width: 8px; height: 8px; border-radius: 50%; }
    .amb-dot--test { background: var(--color-info-text, #3b82f6); }
    .amb-dot--prod { background: var(--color-danger-text, #ef4444); }
    .amb-opt--test { border-color: var(--color-info-text, #3b82f6); background: var(--color-info-bg, rgba(59,130,246,0.08)); color: var(--color-info-text, #3b82f6); }
    .amb-opt--prod { border-color: var(--color-danger-text, #ef4444); background: var(--color-danger-bg, rgba(239,68,68,0.08)); color: var(--color-danger-text, #ef4444); }

    /* Readonly field */
    .readonly-field {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.45rem 0.75rem; border-radius: var(--radius-md);
      border: 1.5px solid var(--color-border-subtle);
      background: var(--color-bg-subtle); color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }
    .readonly-badge {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 99px; background: var(--color-border-subtle); color: var(--color-text-muted);
    }

    /* Certificado */
    .cert-status {
      display: flex; align-items: flex-start; gap: 0.75rem;
      padding: 0.875rem 1rem; border-radius: var(--radius-md);
    }
    .cert-status--ok {
      background: var(--color-success-bg, rgba(16,185,129,0.08));
      color: var(--color-success-text, #10b981);
      border: 1px solid var(--color-success-border, rgba(16,185,129,0.2));
    }
    .cert-status--empty {
      background: var(--color-warning-bg, rgba(245,158,11,0.08));
      color: var(--color-warning-text, #f59e0b);
      border: 1px solid var(--color-warning-border, rgba(245,158,11,0.2));
    }
    .cert-status div { display: flex; flex-direction: column; gap: 2px; }
    .cert-status__title { font-size: var(--font-size-sm); font-weight: 700; }
    .cert-status__sub { font-size: 12px; opacity: 0.8; }

    /* Modal message */
    .modal-msg { font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.6; margin: 0; }
  `]
})
export class EmpresaFiscalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private fiscalService = inject(FiscalService);
  private fiscalState = inject(FiscalStateService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  empresa = signal<EmpresaFiscal | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  p12Base64 = signal('');

  readonly rimpeOptions = [
    { value: '', label: 'Ninguno' },
    { value: 'NEGOCIO_POPULAR', label: 'Negocio Popular' },
    { value: 'EMPRENDEDOR', label: 'Emprendedor' },
  ];
  showProdConfirm = signal(false);
  showDisableFiscalConfirm = signal(false);

  fiscalForm = this.fb.group({
    ruc: ['', [Validators.required, rucValidator]],
    razonSocial: ['', [Validators.required]],
    nombreComercial: [''],
    dirMatriz: ['', [Validators.required]],
    obligadoContabilidad: [false],
    contribuyenteEspecial: [''],
    regimenRimpe: [null as string | null],
    facturacionElectronica: [false],
    ambiente: [1 as number],
    claveP12: [''],
  });

  private previousFacturacion = false;

  ngOnInit() {
    this.fiscalService.getEmpresa().subscribe({
      next: e => {
        this.empresa.set(e);
        this.fiscalForm.patchValue({
          ruc: e.ruc,
          razonSocial: e.razonSocial,
          nombreComercial: e.nombreComercial ?? '',
          dirMatriz: e.dirMatriz,
          obligadoContabilidad: e.obligadoContabilidad,
          contribuyenteEspecial: e.contribuyenteEspecial ?? '',
          regimenRimpe: e.regimenRimpe as any,
          facturacionElectronica: e.facturacionElectronica,
          ambiente: e.ambiente,
        });
        this.previousFacturacion = e.facturacionElectronica;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err?.status !== 404) {
          this.toastService.error('Error al cargar la empresa fiscal');
        }
      }
    });

    // Intercept facturacionElectronica toggle: confirm before disabling
    this.fiscalForm.get('facturacionElectronica')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        if (val === false && this.previousFacturacion) {
          // Revert and show confirmation
          this.fiscalForm.get('facturacionElectronica')!.setValue(true, { emitEvent: false });
          this.showDisableFiscalConfirm.set(true);
        } else {
          this.previousFacturacion = !!val;
        }
      });
  }

  confirmDisableFacturacion() {
    this.fiscalForm.get('facturacionElectronica')!.setValue(false, { emitEvent: false });
    this.previousFacturacion = false;
    this.showDisableFiscalConfirm.set(false);
  }

  cancelDisableFacturacion() {
    this.showDisableFiscalConfirm.set(false);
  }

  setProduccion() {
    if (this.fiscalForm.value.ambiente !== 2) {
      this.showProdConfirm.set(true);
    }
  }

  confirmProduccion() {
    this.fiscalForm.patchValue({ ambiente: 2 });
    this.showProdConfirm.set(false);
  }

  save() {
    if (this.isSaving()) return;
    this.fiscalForm.markAllAsTouched();

    if (this.fiscalForm.invalid) {
      this.toastService.error('Revisa los campos marcados en rojo');
      return;
    }

    const v = this.fiscalForm.getRawValue();

    // Validación condicional: certificado obligatorio en producción
    if (v.facturacionElectronica && v.ambiente === 2) {
      const hasCert = !!this.empresa()?.certificadoP12 || !!this.p12Base64();
      if (!hasCert) {
        this.toastService.error('El certificado digital (.p12) es obligatorio en ambiente de Producción');
        return;
      }
      if (this.p12Base64() && !v.claveP12) {
        this.toastService.error('Ingresa la contraseña del certificado .p12');
        return;
      }
    }

    this.isSaving.set(true);

    const payload: Record<string, any> = {
      ruc: v.ruc!.trim(),
      razonSocial: v.razonSocial!.trim(),
      nombreComercial: v.nombreComercial?.trim() || undefined,
      dirMatriz: v.dirMatriz!.trim(),
      obligadoContabilidad: v.obligadoContabilidad,
      contribuyenteEspecial: v.contribuyenteEspecial?.trim() || undefined,
      regimenRimpe: v.regimenRimpe ?? undefined,
      ambiente: v.ambiente,
      facturacionElectronica: v.facturacionElectronica,
    };

    const p12 = this.p12Base64();
    if (p12) payload['certificadoP12'] = p12;
    if (v.claveP12) payload['claveP12'] = v.claveP12;

    const request = this.empresa()
      ? this.fiscalService.updateEmpresa(payload)
      : this.fiscalService.createEmpresa(payload as any);

    request.subscribe({
      next: e => {
        this.empresa.set(e);
        this.fiscalState.set(e);
        this.previousFacturacion = e.facturacionElectronica;
        this.toastService.success('Empresa fiscal guardada');
        this.isSaving.set(false);
        this.p12Base64.set('');
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message ?? 'Error al guardar');
        this.isSaving.set(false);
      }
    });
  }
}
