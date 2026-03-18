import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';

import { UsersService } from '../../services/users.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUpload, lucideCheck } from '@ng-icons/lucide';

import * as Papa from 'papaparse';

interface ImportRow {
  email: string;
  firstName: string;
  lastName?: string;
  passwordRaw: string;
  isActive?: boolean;
  errors?: string[];
}

@Component({
  selector: 'app-user-import-wizard',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, NgIconComponent],

  template: `
    <div class="import-wizard">
      <!-- STEP 1: Selección de Archivo -->
      @if (step() === 1) {
        <div class="import-step">
          <div class="import-instructions">
            <p>Sigue estos pasos para cargar tus usuarios correctamente:</p>
            <ol>
              <li>Descarga la plantilla oficial en formato CSV.</li>
              <li>Completa los datos (Nombre, Email y Contraseña son obligatorios).</li>
              <li>Sube el archivo aquí para previsualizar los datos.</li>
            </ol>
          </div>

          <div class="import-actions-base">
            <button type="button" class="btn btn-ghost" (click)="downloadTemplate()">
              <ng-icon name="lucideDownload"></ng-icon>
              Descargar Plantilla CSV
            </button>
          </div>

          <div class="import-dropzone" (click)="fileInput.click()">
            <input 
              #fileInput 
              type="file" 
              accept=".csv" 
              style="display: none" 
              (change)="onFileSelected($event)">
            
            <div class="dropzone-content">
              <div class="dropzone-icon">
                <ng-icon name="lucideUpload"></ng-icon>
              </div>
              <div class="dropzone-text">
                <strong>Haz clic para subir</strong> o arrastra un archivo CSV
              </div>
              <div class="dropzone-subtext">Solo archivos .csv (Máx. 5MB)</div>
            </div>
          </div>
        </div>
      }

      <!-- STEP 2: Previsualización y Validación -->
      @if (step() === 2) {
        <div class="import-step import-preview">
          <div class="preview-header">
            <div class="preview-stats">
              <span class="badge badge-primary">{{ rows().length }} filas encontradas</span>
              @if (hasErrors()) {
                <span class="badge badge-danger">Existen errores de validación</span>
              } @else {
                <span class="badge badge-success">Todo listo para importar</span>
              }
            </div>
            <p class="preview-info">
              Revisa los datos antes de confirmar. Si hay filas marcadas en rojo, corrígelas en tu archivo y vuelve a subirlo.
            </p>
          </div>

          <div class="table-container">
            <table class="import-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Errores</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.email) {
                  <tr [class.row-error]="row.errors && row.errors.length > 0">
                    <td>{{ row.firstName }} {{ row.lastName || '' }}</td>
                    <td>{{ row.email }}</td>
                    <td>
                      <span [class]="row.isActive ? 'text-success' : 'text-muted'">
                        {{ row.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      @if (row.errors && row.errors.length > 0) {
                        <ul class="error-list">
                          @for (err of row.errors; track err) {
                            <li>{{ err }}</li>
                          }
                        </ul>
                      } @else {
                        <span class="text-success">
                          <ng-icon name="lucideCheck"></ng-icon>
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Acciones de Pie (Manuales para proyectar) -->
      <div class="modal-footer-actions mt-6">
        @if (step() === 1) {
          <button type="button" class="btn btn-ghost" [disabled]="isProcessing()" (click)="close()">
            Cerrar
          </button>
        }

        @if (step() === 2) {
          <div class="footer-step-2">
            <button type="button" class="btn btn-ghost" [disabled]="isProcessing()" (click)="step.set(1)">
              Volver a Subir
            </button>
            <button type="button" 
                    class="btn btn-primary" 
                    [disabled]="isProcessing() || hasErrors()" 
                    (click)="confirmImport()">
              
              @if (isProcessing()) {
                <app-spinner></app-spinner>
              }
              <span>{{ isProcessing() ? 'Procesando...' : 'Confirmar e Importar' }}</span>
            </button>
          </div>
        }
      </div>
    </div>

  `,
  styleUrls: ['./user-import-wizard.component.scss'],
  providers: [provideIcons({ lucideDownload, lucideUpload, lucideCheck })]
})

export class UserImportWizardComponent {
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);

  @Output() imported = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false); // Mantener para compatibilidad si se usa internalmente

  step = signal(1);
  isProcessing = signal(false);
  
  rows = signal<ImportRow[]>([]);
  hasErrors = signal(false);

  open() {
    this.reset();
    // this.isOpen.set(true); // Ya no se usa internamente
  }


  close() {
    if (this.isProcessing()) return;
    this.closed.emit();
  }


  reset() {
    this.step.set(1);
    this.isProcessing.set(false);
    this.rows.set([]);
    this.hasErrors.set(false);
  }

  downloadTemplate() {
    const headers = ['Email (Obligatorio)', 'Nombre (Obligatorio)', 'Apellido', 'Contraseña (Obligatorio)', '¿Activo? (SI/NO)'];
    const csvContent = headers.join(',') + '\nusuario@ejemplo.com,Juan,Perez,Pass123*,SI';
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_usuarios.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isProcessing.set(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        this.processParsedData(results.data);
        this.isProcessing.set(false);
        this.step.set(2);
      },
      error: (error) => {
        this.toastService.show(`Error al leer el archivo: ${error.message}`, 'error');
        this.isProcessing.set(false);
      }
    });
  }

  private processParsedData(data: any[]) {
    let globalError = false;
    const processedRows = data.map(item => {
      const rowErrors: string[] = [];
      
      const email = item['Email (Obligatorio)'] || item['Email'] || item['email'];
      const firstName = item['Nombre (Obligatorio)'] || item['Nombre'] || item['firstName'] || item['first_name'];
      const lastName = item['Apellido'] || item['lastName'] || item['last_name'];
      const passwordRaw = item['Contraseña (Obligatorio)'] || item['Contraseña'] || item['password'] || item['passwordRaw'];
      
      if (!email || !email.includes('@')) {
        rowErrors.push('Email inválido');
      }
      if (!firstName || firstName.trim().length < 2) {
        rowErrors.push('Nombre inválido (mínimo 2 caracteres)');
      }
      if (!passwordRaw || passwordRaw.trim().length < 6) {
        rowErrors.push('Contraseña inválida (mínimo 6 caracteres)');
      }

      const row: ImportRow = {
        email: email?.trim(),
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        passwordRaw: passwordRaw?.trim(),
        isActive: this.parseBoolean(item['¿Activo? (SI/NO)'] || item['isActive']),
        errors: rowErrors
      };

      if (rowErrors.length > 0) globalError = true;
      return row;
    });

    this.rows.set(processedRows);
    this.hasErrors.set(globalError);
  }

  private parseBoolean(val: any): boolean {
    if (typeof val === 'boolean') return val;
    const str = String(val).toLowerCase().trim();
    return str === 'si' || str === 'true' || str === '1' || str === 'yes' || str === '';
  }

  confirmImport() {
    if (this.hasErrors() || this.isProcessing()) return;

    this.isProcessing.set(true);
    
    const users = this.rows().map(r => ({
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      passwordRaw: r.passwordRaw,
      isActive: r.isActive,
      roleIds: [],
      branchIds: []
    }));

    this.usersService.bulkImport(users).subscribe({
      next: (res: { imported: number; errors: string[] }) => {
        if (res.errors.length > 0) {
          this.toastService.show(`Se importaron ${res.imported} usuarios, pero hubo algunos errores.`, 'error');
        } else {
          this.toastService.show(`¡Éxito! Se importaron ${res.imported} usuarios correctamente.`, 'success');
        }
        this.isProcessing.set(false);
        this.imported.emit();
      },

      error: (err: any) => {
        const msg = err.error?.message || 'Error en la importación masiva';
        this.toastService.show(msg, 'error');
        this.isProcessing.set(false);
      }
    });
  }
}

