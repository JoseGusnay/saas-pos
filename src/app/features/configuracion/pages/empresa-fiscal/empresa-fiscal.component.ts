import { Component, ViewChild, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2, lucideFileText, lucideShieldCheck,
  lucideUpload, lucideCheckCircle2, lucideAlertTriangle,
  lucideSave, lucideRefreshCw, lucideInfo,
} from '@ng-icons/lucide';

import { FiscalService } from '../../../../core/services/fiscal.service';
import { FiscalStateService } from '../../../../core/services/fiscal-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { EmpresaFiscal, UpdateEmpresaFiscalPayload, AmbienteSri } from '../../../../core/models/fiscal.models';

@Component({
  selector: 'app-empresa-fiscal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, FormButtonComponent, SpinnerComponent],
  providers: [provideIcons({
    lucideBuilding2, lucideFileText, lucideShieldCheck,
    lucideUpload, lucideCheckCircle2, lucideAlertTriangle,
    lucideSave, lucideRefreshCw, lucideInfo,
  })],
  template: `
    <div class="ef-page">

      <!-- ── Header ─────────────────────────────────────────────────────────── -->
      <div class="ef-header">
        <div class="ef-header__left">
          <h1 class="ef-title">Empresa Fiscal</h1>
          <p class="ef-subtitle">Datos tributarios y configuración SRI de tu empresa</p>
        </div>
        <app-form-button
          [label]="empresa() ? 'Guardar Cambios' : 'Configurar Empresa'"
          loadingLabel="Guardando..."
          icon="lucideSave"
          [type]="'button'"
          [loading]="isSaving()"
          [disabled]="isSaving() || isLoading()"
          (click)="save()"
        ></app-form-button>
      </div>

      @if (isLoading()) {
        <div class="ef-loading"><app-spinner></app-spinner></div>
      } @else {

        <!-- ── Ambiente banner (solo si facturación activa) ────────────────── -->
        @if (form.facturacionElectronica) {
          @if (form.ambiente === 2) {
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

        <form #efForm="ngForm" class="ef-grid" (ngSubmit)="save()">

          <!-- ── Card: Datos tributarios ──────────────────────────────────── -->
          <div class="ef-card">
            <div class="ef-card__head">
              <ng-icon name="lucideBuilding2" size="14"></ng-icon>
              <span>DATOS TRIBUTARIOS</span>
            </div>
            <div class="ef-card__body">

              <div class="ef-row ef-row--2">
                <div class="ef-field">
                  <label class="ef-label">RUC <span class="req">*</span></label>
                  <input class="ef-input" type="text" name="ruc" [(ngModel)]="form.ruc" #ruc="ngModel"
                    required minlength="13" maxlength="13" pattern="[0-9]{13}"
                    placeholder="1799999999001" [class.ef-input--error]="ruc.invalid && ruc.touched" />
                  @if (ruc.invalid && ruc.touched) {
                    <span class="ef-error">
                      @if (ruc.hasError('required')) { El RUC es requerido }
                      @else if (ruc.hasError('minlength') || ruc.hasError('maxlength')) { Debe tener exactamente 13 dígitos }
                      @else if (ruc.hasError('pattern')) { Solo debe contener números }
                    </span>
                  } @else {
                    <span class="ef-hint">13 dígitos, termina en 001</span>
                  }
                </div>
                <div class="ef-field">
                  <label class="ef-label">RAZÓN SOCIAL <span class="req">*</span></label>
                  <input class="ef-input" type="text" name="razonSocial" [(ngModel)]="form.razonSocial" #razonSocial="ngModel"
                    required placeholder="COMERCIALIZADORA ANDINA S.A."
                    [class.ef-input--error]="razonSocial.invalid && razonSocial.touched" />
                  @if (razonSocial.invalid && razonSocial.touched) {
                    <span class="ef-error">La razón social es requerida</span>
                  }
                </div>
              </div>

              <div class="ef-row ef-row--2">
                <div class="ef-field">
                  <label class="ef-label">NOMBRE COMERCIAL</label>
                  <input class="ef-input" type="text" name="nombreComercial" [(ngModel)]="form.nombreComercial"
                    placeholder="Nombre comercial (opcional)" />
                </div>
                <div class="ef-field">
                  <label class="ef-label">N° CONTRIBUYENTE ESPECIAL</label>
                  <input class="ef-input" type="text" name="contribuyenteEspecial" [(ngModel)]="form.contribuyenteEspecial"
                    placeholder="Nro. Resolución o vacío" />
                </div>
              </div>

              <div class="ef-field">
                <label class="ef-label">DIRECCIÓN MATRIZ <span class="req">*</span></label>
                <input class="ef-input" type="text" name="dirMatriz" [(ngModel)]="form.dirMatriz" #dirMatriz="ngModel"
                  required placeholder="Av. Principal 123, Ciudad, Ecuador"
                  [class.ef-input--error]="dirMatriz.invalid && dirMatriz.touched" />
                @if (dirMatriz.invalid && dirMatriz.touched) {
                  <span class="ef-error">La dirección matriz es requerida</span>
                }
              </div>

              <div class="ef-row ef-row--2">
                <div class="ef-field">
                  <label class="ef-label">FACTURACIÓN ELECTRÓNICA</label>
                  <div class="toggle-row">
                    <button type="button" class="toggle-btn"
                      [class.toggle-btn--on]="form.facturacionElectronica"
                      (click)="toggleFacturacion()">
                      <span class="toggle-thumb"></span>
                    </button>
                    <span class="toggle-label">{{ form.facturacionElectronica ? 'ACTIVA' : 'INACTIVA' }}</span>
                  </div>
                  <span class="ef-hint">{{ form.facturacionElectronica ? 'Comprobantes electrónicos habilitados' : 'Solo datos básicos de sucursales' }}</span>
                </div>
                <div class="ef-field">
                  <label class="ef-label">OBLIGADO A LLEVAR CONTABILIDAD</label>
                  <div class="toggle-row">
                    <button type="button" class="toggle-btn"
                      [class.toggle-btn--on]="form.obligadoContabilidad"
                      (click)="form.obligadoContabilidad = !form.obligadoContabilidad">
                      <span class="toggle-thumb"></span>
                    </button>
                    <span class="toggle-label">{{ form.obligadoContabilidad ? 'SÍ' : 'NO' }}</span>
                  </div>
                </div>
              </div>

              <div class="ef-field">
                <label class="ef-label">RÉGIMEN RIMPE</label>
                <div class="rimpe-opts">
                  <button type="button" class="rimpe-opt" [class.rimpe-opt--active]="!form.regimenRimpe"
                    (click)="form.regimenRimpe = null">Ninguno</button>
                  <button type="button" class="rimpe-opt" [class.rimpe-opt--active]="form.regimenRimpe === 'NEGOCIO_POPULAR'"
                    (click)="form.regimenRimpe = 'NEGOCIO_POPULAR'">Negocio Popular</button>
                  <button type="button" class="rimpe-opt" [class.rimpe-opt--active]="form.regimenRimpe === 'EMPRENDEDOR'"
                    (click)="form.regimenRimpe = 'EMPRENDEDOR'">Emprendedor</button>
                </div>
              </div>

            </div>
          </div>

          <!-- ── Cards condicionales: solo con facturación electrónica ──────── -->
          @if (form.facturacionElectronica) {

            <!-- ── Card: Configuración SRI ────────────────────────────────── -->
            <div class="ef-card">
              <div class="ef-card__head">
                <ng-icon name="lucideFileText" size="14"></ng-icon>
                <span>CONFIGURACIÓN SRI</span>
              </div>
              <div class="ef-card__body">

                <div class="ef-field">
                  <label class="ef-label">AMBIENTE</label>
                  <div class="amb-toggle">
                    <button type="button" class="amb-opt"
                      [class.amb-opt--test]="form.ambiente === 1"
                      (click)="form.ambiente = 1">
                      <span class="amb-dot amb-dot--test"></span>
                      Pruebas
                    </button>
                    <button type="button" class="amb-opt"
                      [class.amb-opt--prod]="form.ambiente === 2"
                      (click)="setProduccion()">
                      <span class="amb-dot amb-dot--prod"></span>
                      Producción
                    </button>
                  </div>
                  <span class="ef-hint">
                    @if (form.ambiente === 1) {
                      Los comprobantes no tienen validez tributaria ante el SRI
                    } @else {
                      Los comprobantes emitidos son documentos tributarios válidos
                    }
                  </span>
                </div>

                <div class="ef-field">
                  <label class="ef-label">TIPO DE EMISIÓN</label>
                  <div class="readonly-field">
                    <span>1 — Normal (en línea)</span>
                    <span class="readonly-badge">Fijo por SRI</span>
                  </div>
                </div>

              </div>
            </div>

            <!-- ── Card: Certificado digital ──────────────────────────────── -->
            <div class="ef-card">
              <div class="ef-card__head">
                <ng-icon name="lucideShieldCheck" size="14"></ng-icon>
                <span>CERTIFICADO DIGITAL (.P12)</span>
              </div>
              <div class="ef-card__body">

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

                <div class="ef-field">
                  <label class="ef-label">ARCHIVO .P12</label>
                  <label class="upload-area" [class.upload-area--has-file]="p12FileName()">
                    <ng-icon name="lucideUpload" size="18"></ng-icon>
                    <span>{{ p12FileName() || 'Haz clic para seleccionar el archivo .p12' }}</span>
                    <input type="file" accept=".p12" (change)="onP12Change($event)" style="display:none" />
                  </label>
                </div>

                <div class="ef-field">
                  <label class="ef-label">CONTRASEÑA DEL CERTIFICADO</label>
                  <input class="ef-input" type="password" name="claveP12" [(ngModel)]="form.claveP12"
                    placeholder="Contraseña del archivo .p12" autocomplete="new-password" />
                </div>

              </div>
            </div>

          }

        </form>

        <!-- Confirm dialog desactivar facturación -->
        @if (showDisableFiscalConfirm()) {
          <div class="overlay" (click)="showDisableFiscalConfirm.set(false)">
            <div class="confirm-dialog" (click)="$event.stopPropagation()">
              <div class="confirm-dialog__icon">
                <ng-icon name="lucideAlertTriangle" size="28"></ng-icon>
              </div>
              <h3>¿Desactivar facturación electrónica?</h3>
              <p>Los campos SRI de las sucursales quedarán ocultos pero los datos no se eliminarán. Podrás reactivarla en cualquier momento.</p>
              <div class="confirm-dialog__actions">
                <button class="btn-secondary" (click)="showDisableFiscalConfirm.set(false)">Cancelar</button>
                <button class="btn-danger" (click)="confirmDisableFacturacion()">Sí, desactivar</button>
              </div>
            </div>
          </div>
        }

        <!-- Confirm dialog producción -->
        @if (showProdConfirm()) {
          <div class="overlay" (click)="showProdConfirm.set(false)">
            <div class="confirm-dialog" (click)="$event.stopPropagation()">
              <div class="confirm-dialog__icon">
                <ng-icon name="lucideAlertTriangle" size="28"></ng-icon>
              </div>
              <h3>¿Cambiar a Producción?</h3>
              <p>Los comprobantes emitidos serán documentos tributarios válidos ante el SRI. Asegúrate de tener el certificado digital vigente configurado.</p>
              <div class="confirm-dialog__actions">
                <button class="btn-secondary" (click)="showProdConfirm.set(false)">Cancelar</button>
                <button class="btn-danger" (click)="confirmProduccion()">Sí, cambiar a Producción</button>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .ef-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; }

    /* Header */
    .ef-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
      flex-wrap: wrap;
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
      background: rgba(59,130,246,0.08); color: #3b82f6;
      border: 1px solid rgba(59,130,246,0.2);
    }
    .env-banner--prod {
      background: rgba(239,68,68,0.08); color: #ef4444;
      border: 1px solid rgba(239,68,68,0.2);
    }

    /* Grid */
    .ef-grid { display: flex; flex-direction: column; gap: 1.25rem; }

    /* Cards */
    .ef-card {
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
    }
    .ef-card__head {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--color-border-light);
      background: var(--color-bg-subtle); border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .ef-card__body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }

    /* Fields */
    .ef-row { display: grid; gap: 1rem; }
    .ef-row--2 { grid-template-columns: 1fr 1fr; }
    @media (max-width: 640px) { .ef-row--2 { grid-template-columns: 1fr; } }

    .ef-field { display: flex; flex-direction: column; gap: 6px; }
    .ef-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .req { color: var(--color-danger-text); }
    .ef-hint { font-size: 11px; color: var(--color-text-muted); }
    .ef-error { font-size: 11px; color: var(--color-danger-text, #ef4444); }
    .ef-input {
      padding: 0.45rem 0.75rem; border: 1.5px solid var(--color-border-light);
      border-radius: var(--radius-md); background: var(--color-bg-surface);
      color: var(--color-text-main); font-size: var(--font-size-sm); font-family: inherit;
      transition: border-color var(--transition-base);
    }
    .ef-input:focus { outline: none; border-color: var(--color-accent-primary); }
    .ef-input::placeholder { color: var(--color-text-muted); }
    .ef-input--error { border-color: var(--color-danger-text, #ef4444) !important; }

    /* Toggle */
    .toggle-row { display: flex; align-items: center; gap: 0.75rem; padding-top: 4px; }
    .toggle-btn {
      width: 44px; height: 24px; border-radius: 99px; border: none; cursor: pointer;
      background: var(--color-border-subtle); position: relative;
      transition: background var(--transition-base);
    }
    .toggle-btn--on { background: var(--color-accent-primary); }
    .toggle-thumb {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 50%;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      transition: transform var(--transition-base);
      box-shadow: var(--shadow-sm);
    }
    .toggle-btn--on .toggle-thumb {
      transform: translateX(20px);
      border-color: var(--color-accent-primary);
    }
    .toggle-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-main); }

    /* RIMPE options */
    .rimpe-opts { display: flex; gap: 0.375rem; flex-wrap: wrap; }
    .rimpe-opt {
      padding: 5px 11px; border-radius: 99px; cursor: pointer;
      border: 1.5px solid var(--color-border-light);
      background: var(--color-bg-surface); color: var(--color-text-muted);
      font-size: var(--font-size-xs); font-weight: 600;
      transition: all var(--transition-base);
    }
    .rimpe-opt:hover { border-color: var(--color-accent-primary); color: var(--color-text-main); background: var(--color-bg-hover); }
    .rimpe-opt--active { background: var(--color-bg-hover); border-color: var(--color-accent-primary); color: var(--color-text-main); font-weight: 700; }

    /* Ambiente toggle */
    .amb-toggle { display: flex; gap: 0.5rem; }
    .amb-opt {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.625rem; border-radius: var(--radius-md); cursor: pointer;
      border: 1.5px solid var(--color-border-light);
      background: var(--color-bg-surface); color: var(--color-text-muted);
      font-size: var(--font-size-sm); font-weight: 600;
      transition: all var(--transition-base);
    }
    .amb-dot { width: 8px; height: 8px; border-radius: 50%; }
    .amb-dot--test { background: #3b82f6; }
    .amb-dot--prod { background: #ef4444; }
    .amb-opt--test { border-color: #3b82f6; background: rgba(59,130,246,0.08); color: #3b82f6; }
    .amb-opt--prod { border-color: #ef4444; background: rgba(239,68,68,0.08); color: #ef4444; }

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
    .cert-status--ok { background: rgba(16,185,129,0.08); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
    .cert-status--empty { background: rgba(245,158,11,0.08); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
    .cert-status div { display: flex; flex-direction: column; gap: 2px; }
    .cert-status__title { font-size: var(--font-size-sm); font-weight: 700; }
    .cert-status__sub { font-size: 12px; opacity: 0.8; }

    .upload-area {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.875rem 1rem; border-radius: var(--radius-md); cursor: pointer;
      border: 1.5px dashed var(--color-border-light);
      background: var(--color-bg-subtle); color: var(--color-text-muted);
      font-size: var(--font-size-sm); transition: all var(--transition-base);
    }
    .upload-area:hover { border-color: var(--color-accent-primary); color: var(--color-accent-primary); }
    .upload-area--has-file { border-style: solid; border-color: var(--color-accent-primary); color: var(--color-text-main); }

    /* Confirm dialog */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }
    .confirm-dialog {
      background: var(--color-bg-surface); border-radius: var(--radius-lg);
      padding: 2rem; max-width: 420px; width: 100%;
      display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .confirm-dialog__icon { color: #ef4444; }
    .confirm-dialog h3 { font-size: 1.125rem; font-weight: 700; color: var(--color-text-main); margin: 0; }
    .confirm-dialog p { font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0; line-height: 1.6; }
    .confirm-dialog__actions { display: flex; gap: 0.75rem; width: 100%; }
    .btn-secondary {
      flex: 1; padding: 0.625rem; border-radius: var(--radius-md);
      border: 1.5px solid var(--color-border-light);
      background: transparent; color: var(--color-text-main);
      font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
      transition: all var(--transition-base);
    }
    .btn-secondary:hover { background: var(--color-bg-hover); }
    .btn-danger {
      flex: 1; padding: 0.625rem; border-radius: var(--radius-md);
      border: none; background: #ef4444; color: #fff;
      font-size: var(--font-size-sm); font-weight: 700; cursor: pointer;
      transition: opacity var(--transition-base);
    }
    .btn-danger:hover { opacity: 0.88; }
  `]
})
export class EmpresaFiscalComponent implements OnInit {
  private fiscalService  = inject(FiscalService);
  private fiscalState    = inject(FiscalStateService);
  private toastService   = inject(ToastService);

  @ViewChild('efForm') efForm?: NgForm;

  empresa    = signal<EmpresaFiscal | null>(null);
  isLoading  = signal(true);
  isSaving   = signal(false);
  p12FileName = signal('');
  showProdConfirm = signal(false);
  showDisableFiscalConfirm = signal(false);

  form: {
    ruc: string;
    razonSocial: string;
    nombreComercial: string;
    dirMatriz: string;
    obligadoContabilidad: boolean;
    contribuyenteEspecial: string;
    regimenRimpe: 'NEGOCIO_POPULAR' | 'EMPRENDEDOR' | null;
    ambiente: AmbienteSri;
    claveP12: string;
    p12Base64: string;
    facturacionElectronica: boolean;
  } = {
    ruc: '', razonSocial: '', nombreComercial: '', dirMatriz: '',
    obligadoContabilidad: false, contribuyenteEspecial: '',
    regimenRimpe: null, ambiente: 1, claveP12: '', p12Base64: '',
    facturacionElectronica: false,
  };

  ngOnInit() {
    this.fiscalService.getEmpresa().subscribe({
      next: e => {
        this.empresa.set(e);
        this.form.ruc = e.ruc;
        this.form.razonSocial = e.razonSocial;
        this.form.nombreComercial = e.nombreComercial ?? '';
        this.form.dirMatriz = e.dirMatriz;
        this.form.obligadoContabilidad = e.obligadoContabilidad;
        this.form.contribuyenteEspecial = e.contribuyenteEspecial ?? '';
        this.form.regimenRimpe = e.regimenRimpe as any;
        this.form.ambiente = e.ambiente;
        this.form.facturacionElectronica = e.facturacionElectronica;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err?.status !== 404) {
          this.toastService.error('Error al cargar la empresa fiscal');
        }
      }
    });
  }

  toggleFacturacion() {
    if (this.form.facturacionElectronica) {
      this.showDisableFiscalConfirm.set(true);
    } else {
      this.form.facturacionElectronica = true;
    }
  }

  confirmDisableFacturacion() {
    this.form.facturacionElectronica = false;
    this.showDisableFiscalConfirm.set(false);
  }

  setProduccion() {
    this.showProdConfirm.set(true);
  }

  confirmProduccion() {
    this.form.ambiente = 2;
    this.showProdConfirm.set(false);
  }

  onP12Change(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.p12FileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      this.form.p12Base64 = base64;
    };
    reader.readAsDataURL(file);
  }

  save() {
    if (this.isSaving()) return;
    this.efForm?.form.markAllAsTouched();
    if (!this.form.ruc || !this.form.razonSocial || !this.form.dirMatriz) {
      this.toastService.error('RUC, razón social y dirección matriz son requeridos');
      return;
    }
    this.isSaving.set(true);
    const payload: any = {
      ruc:                  this.form.ruc.trim(),
      razonSocial:          this.form.razonSocial.trim(),
      nombreComercial:      this.form.nombreComercial.trim() || undefined,
      dirMatriz:            this.form.dirMatriz.trim(),
      obligadoContabilidad: this.form.obligadoContabilidad,
      contribuyenteEspecial: this.form.contribuyenteEspecial.trim() || undefined,
      regimenRimpe:            this.form.regimenRimpe ?? undefined,
      ambiente:                this.form.ambiente,
      facturacionElectronica:  this.form.facturacionElectronica,
    };
    if (this.form.p12Base64) payload.certificadoP12 = this.form.p12Base64;
    if (this.form.claveP12)  payload.claveP12 = this.form.claveP12;

    const request = this.empresa()
      ? this.fiscalService.updateEmpresa(payload)
      : this.fiscalService.createEmpresa(payload);

    request.subscribe({
      next: e => {
        this.empresa.set(e);
        this.fiscalState.set(e);
        this.toastService.success('Empresa fiscal guardada');
        this.isSaving.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message ?? 'Error al guardar');
        this.isSaving.set(false);
      }
    });
  }
}
