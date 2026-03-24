import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { UsersService } from '../../services/users.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUploadCloud, lucideCheck } from '@ng-icons/lucide';
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
  selector: 'app-user-import-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, SpinnerComponent, NgIconComponent],
  templateUrl: './user-import-modal.html',
  styleUrls: ['./user-import-modal.scss'],
  providers: [provideIcons({ lucideDownload, lucideUploadCloud, lucideCheck })]
})
export class UserImportModalComponent {
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);

  @Output() imported = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);
  step = signal(1);
  isProcessing = signal(false);
  
  rows = signal<ImportRow[]>([]);
  hasErrors = signal(false);

  open() {
    this.reset();
    this.isOpen.set(true);
  }

  close() {
    if (this.isProcessing()) return;
    this.isOpen.set(false);
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
        this.toastService.error(`Error al leer el archivo: ${error.message}`);
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
          this.toastService.error(`Se importaron ${res.imported} usuarios, pero hubo algunos errores.`);
        } else {
          this.toastService.success(`Se importaron ${res.imported} usuarios correctamente.`);
        }
        this.isProcessing.set(false);
        this.isOpen.set(false);
        this.imported.emit();
      },
      error: (err: any) => {
        const msg = err.error?.message || 'Error en la importación masiva';
        this.toastService.error(msg);
        this.isProcessing.set(false);
      }
    });
  }
}
