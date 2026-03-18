import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { BranchService } from '../../../../core/services/branch.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUploadCloud, lucideCheck } from '@ng-icons/lucide';
import * as Papa from 'papaparse';

interface ImportRow {
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  manager?: string;
  revenue?: number;
  isActive?: boolean;
  isMain?: boolean;
  errors?: string[];
}

@Component({
  selector: 'app-branch-import-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, SpinnerComponent, NgIconComponent],
  templateUrl: './branch-import-modal.html',
  styleUrls: ['./branch-import-modal.scss'],
  providers: [provideIcons({ lucideDownload, lucideUploadCloud, lucideCheck })]
})
export class BranchImportModalComponent {
  private branchService = inject(BranchService);
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
    const headers = ['Nombre (Obligatorio)', 'Ciudad', 'Dirección', 'Teléfono', 'Gerente', 'Ingresos Hoy', '¿Activa? (SI/NO)', '¿Principal? (SI/NO)'];
    const csvContent = headers.join(',') + '\nExito,Guayaquil,Av. principal,0999999999,Juan Perez,150.50,SI,NO';
    
    // Agregamos el BOM (Byte Order Mark) para que Excel reconozca UTF-8 correctamente
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_sucursales.csv');
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
      
      // Mapeo flexible de nombres de columnas
      const name = item['Nombre (Obligatorio)'] || item['Nombre'] || item['name'];
      
      if (!name || name.trim().length < 3) {
        rowErrors.push('Nombre inválido (mínimo 3 caracteres)');
      }

      const row: ImportRow = {
        name: name?.trim(),
        city: item['Ciudad'] || item['city'],
        address: item['Dirección'] || item['address'],
        phone: item['Teléfono'] || item['phone'],
        manager: item['Gerente'] || item['manager'],
        revenue: parseFloat(item['Ingresos Hoy'] || item['revenue'] || '0'),
        isActive: this.parseBoolean(item['¿Activa? (SI/NO)'] || item['isActive']),
        isMain: this.parseBoolean(item['¿Principal? (SI/NO)'] || item['isMain']),
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
    return str === 'si' || str === 'true' || str === '1' || str === 'yes';
  }

  confirmImport() {
    if (this.hasErrors() || this.isProcessing()) return;

    this.isProcessing.set(true);
    
    // Preparar datos para el DTO
    const branches = this.rows().map(r => ({
      name: r.name,
      city: r.city,
      address: r.address,
      phone: r.phone,
      manager: r.manager,
      revenue: r.revenue,
      isActive: r.isActive,
      isMain: r.isMain
    }));

    this.branchService.bulkImport(branches).subscribe({
      next: (res: { count: number }) => {
        this.toastService.show(`¡Éxito! Se importaron ${res.count} sucursales correctamente.`, 'success');
        this.isProcessing.set(false);
        this.isOpen.set(false);
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
