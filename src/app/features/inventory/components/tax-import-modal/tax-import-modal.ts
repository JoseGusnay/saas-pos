import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { TaxService } from '../../../../core/services/tax.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUploadCloud, lucideCheck } from '@ng-icons/lucide';
import * as Papa from 'papaparse';

interface ImportRow {
  name: string;
  code: string;
  sriCode?: string;
  type: 'PERCENTAGE' | 'FIXED';
  percentage?: number;
  fixedAmount?: number;
  isActive?: boolean;
  errors?: string[];
}

@Component({
  selector: 'app-tax-import-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, SpinnerComponent, NgIconComponent],
  templateUrl: './tax-import-modal.html',
  styleUrls: ['./tax-import-modal.scss'],
  providers: [provideIcons({ lucideDownload, lucideUploadCloud, lucideCheck })]
})
export class TaxImportModalComponent {
  private taxService = inject(TaxService);
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
    const headers = ['Nombre (Obligatorio)', 'Código (Obligatorio)', 'Código SRI', 'Tipo (PERCENTAGE/FIXED)', 'Porcentaje', 'Monto Fijo', '¿Activo? (SI/NO)'];
    const csvContent = headers.join(',') + '\nIVA 15%,IVA15,,PERCENTAGE,15,0,SI\nICE Bebidas,ICE01,3023,FIXED,,0.10,SI';
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_impuestos.csv');
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
    const validTypes = ['PERCENTAGE', 'FIXED'];

    const processedRows = data.map(item => {
      const rowErrors: string[] = [];
      const name = item['Nombre (Obligatorio)'] || item['Nombre'] || item['name'];
      const code = item['Código (Obligatorio)'] || item['Código'] || item['code'];
      const rawType = (item['Tipo (PERCENTAGE/FIXED)'] || item['Tipo'] || item['type'] || 'PERCENTAGE').toUpperCase().trim();

      if (!name || name.trim().length < 2) rowErrors.push('Nombre demasiado corto');
      if (!code || code.trim().length === 0) rowErrors.push('Código requerido');
      if (!validTypes.includes(rawType)) rowErrors.push(`Tipo inválido: ${rawType}`);

      const row: ImportRow = {
        name: name?.trim(),
        code: code?.trim(),
        sriCode: (item['Código SRI'] || item['sriCode'] || '').trim() || undefined,
        type: validTypes.includes(rawType) ? rawType as 'PERCENTAGE' | 'FIXED' : 'PERCENTAGE',
        percentage: parseFloat(item['Porcentaje'] || item['percentage']) || undefined,
        fixedAmount: parseFloat(item['Monto Fijo'] || item['fixedAmount']) || 0,
        isActive: this.parseBoolean(item['¿Activo? (SI/NO)'] || item['isActive']),
        errors: rowErrors,
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

    const taxes = this.rows().map(r => ({
      name: r.name,
      code: r.code,
      sriCode: r.sriCode,
      type: r.type,
      percentage: r.percentage,
      fixedAmount: r.fixedAmount,
      isActive: r.isActive,
    }));

    this.taxService.bulkImport(taxes).subscribe({
      next: (res) => {
        this.toastService.success(`Se importaron ${res.count} impuestos correctamente.`);
        this.isProcessing.set(false);
        this.isOpen.set(false);
        this.imported.emit();
      },
      error: (err) => {
        this.toastService.error(err.message || 'Error en la importación');
        this.isProcessing.set(false);
      }
    });
  }
}
