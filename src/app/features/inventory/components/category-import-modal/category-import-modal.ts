import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { CategoryService } from '../../../../core/services/category.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUploadCloud, lucideCheck } from '@ng-icons/lucide';
import * as Papa from 'papaparse';

interface ImportRow {
  name: string;
  description?: string;
  isActive?: boolean;
  errors?: string[];
}

@Component({
  selector: 'app-category-import-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, SpinnerComponent, NgIconComponent],
  templateUrl: './category-import-modal.html',
  styleUrls: ['./category-import-modal.scss'],
  providers: [provideIcons({ lucideDownload, lucideUploadCloud, lucideCheck })]
})
export class CategoryImportModalComponent {
  private categoryService = inject(CategoryService);
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
    const headers = ['Nombre (Obligatorio)', 'Descripción', '¿Activa? (SI/NO)'];
    const csvContent = headers.join(',') + '\nElectrónica,Productos electrónicos de consumo,SI\nLimpieza,,SI';
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_categorias.csv');
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
      const name = item['Nombre (Obligatorio)'] || item['Nombre'] || item['name'];
      
      if (!name || name.trim().length < 3) {
        rowErrors.push('Nombre inválido (mínimo 3 caracteres)');
      }

      const row: ImportRow = {
        name: name?.trim(),
        description: item['Descripción'] || item['description'],
        isActive: this.parseBoolean(item['¿Activa? (SI/NO)'] || item['isActive']),
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
    
    const categories = this.rows().map(r => ({
      name: r.name,
      description: r.description,
      isActive: r.isActive
    }));

    this.categoryService.bulkImport(categories).subscribe({
      next: (res) => {
        this.toastService.success(`¡Éxito! Se importaron ${res.count} categorías.`);
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
