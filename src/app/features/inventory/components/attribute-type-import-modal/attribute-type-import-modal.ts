import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { AttributeTypeService } from '../../../../core/services/attribute-type.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AttributeDataType, DATA_TYPE_LABELS } from '../../models/product.model';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUploadCloud, lucideCheck } from '@ng-icons/lucide';
import * as Papa from 'papaparse';

interface ImportRow {
  name: string;
  dataType: AttributeDataType;
  unit?: string;
  isActive?: boolean;
  errors?: string[];
}

@Component({
  selector: 'app-attribute-type-import-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, SpinnerComponent, NgIconComponent],
  templateUrl: './attribute-type-import-modal.html',
  styleUrls: ['./attribute-type-import-modal.scss'],
  providers: [provideIcons({ lucideDownload, lucideUploadCloud, lucideCheck })]
})
export class AttributeTypeImportModalComponent {
  private attrService = inject(AttributeTypeService);
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
    const headers = ['Nombre (Obligatorio)', 'Tipo de Dato (TEXT/NUMBER/COLOR/BOOLEAN)', 'Unidad', '¿Activo? (SI/NO)'];
    const csvContent = headers.join(',') + '\nTalla,TEXT,,SI\nPeso,NUMBER,kg,SI\nColor,COLOR,,SI';
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_atributos.csv');
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
    const validTypes: string[] = ['TEXT', 'NUMBER', 'COLOR', 'BOOLEAN'];

    const processedRows = data.map(item => {
      const rowErrors: string[] = [];
      const name = item['Nombre (Obligatorio)'] || item['Nombre'] || item['name'];
      const rawType = (item['Tipo de Dato (TEXT/NUMBER/COLOR/BOOLEAN)'] || item['Tipo de Dato'] || item['dataType'] || 'TEXT').toUpperCase().trim();
      const unit = item['Unidad'] || item['unit'] || '';

      if (!name || name.trim().length < 2) {
        rowErrors.push('Nombre demasiado corto');
      }
      if (!validTypes.includes(rawType)) {
        rowErrors.push(`Tipo inválido: ${rawType}`);
      }

      const row: ImportRow = {
        name: name?.trim(),
        dataType: validTypes.includes(rawType) ? rawType as AttributeDataType : 'TEXT',
        unit: unit?.trim() || undefined,
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

  dataTypeLabel(dt: AttributeDataType): string {
    return DATA_TYPE_LABELS[dt] ?? dt;
  }

  confirmImport() {
    if (this.hasErrors() || this.isProcessing()) return;
    this.isProcessing.set(true);

    const attrs = this.rows().map(r => ({
      name: r.name,
      dataType: r.dataType,
      unit: r.unit,
      isActive: r.isActive,
    }));

    this.attrService.bulkImport(attrs).subscribe({
      next: (res) => {
        this.toastService.success(`Se importaron ${res.count} atributos correctamente.`);
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
