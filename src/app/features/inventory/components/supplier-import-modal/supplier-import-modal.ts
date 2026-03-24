import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { SupplierService } from '../../../../core/services/supplier.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUploadCloud, lucideCheck } from '@ng-icons/lucide';
import * as Papa from 'papaparse';

interface ImportRow {
  name: string;
  ruc?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  isActive?: boolean;
  errors?: string[];
}

@Component({
  selector: 'app-supplier-import-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, SpinnerComponent, NgIconComponent],
  templateUrl: './supplier-import-modal.html',
  styleUrls: ['./supplier-import-modal.scss'],
  providers: [provideIcons({ lucideDownload, lucideUploadCloud, lucideCheck })]
})
export class SupplierImportModalComponent {
  private supplierService = inject(SupplierService);
  private toastService = inject(ToastService);

  @Output() imported = new EventEmitter<void>();
  isOpen = signal(false);
  step = signal(1);
  isProcessing = signal(false);
  rows = signal<ImportRow[]>([]);
  hasErrors = signal(false);

  open() { this.reset(); this.isOpen.set(true); }
  close() { if (this.isProcessing()) return; this.isOpen.set(false); }
  reset() { this.step.set(1); this.isProcessing.set(false); this.rows.set([]); this.hasErrors.set(false); }

  downloadTemplate() {
    const headers = ['Nombre (Obligatorio)', 'RUC/Cédula', 'Email', 'Teléfono', 'Contacto', '¿Activo? (SI/NO)'];
    const csv = headers.join(',') + '\nDistribuidora ABC,0992345678001,ventas@abc.com,042345678,Juan Pérez,SI';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_proveedores.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0]; if (!file) return;
    this.isProcessing.set(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (r) => { this.processParsedData(r.data); this.isProcessing.set(false); this.step.set(2); },
      error: (e) => { this.toastService.error(`Error: ${e.message}`); this.isProcessing.set(false); }
    });
  }

  private processParsedData(data: any[]) {
    let err = false;
    const rows = data.map(item => {
      const rowErrors: string[] = [];
      const name = item['Nombre (Obligatorio)'] || item['Nombre'] || item['name'];
      if (!name || name.trim().length < 2) rowErrors.push('Nombre demasiado corto');
      if (rowErrors.length) err = true;
      return {
        name: name?.trim(),
        ruc: (item['RUC/Cédula'] || item['ruc'] || '').trim() || undefined,
        email: (item['Email'] || item['email'] || '').trim() || undefined,
        phone: (item['Teléfono'] || item['phone'] || '').trim() || undefined,
        contactName: (item['Contacto'] || item['contactName'] || '').trim() || undefined,
        isActive: this.parseBool(item['¿Activo? (SI/NO)'] || item['isActive']),
        errors: rowErrors,
      } as ImportRow;
    });
    this.rows.set(rows); this.hasErrors.set(err);
  }

  private parseBool(v: any): boolean {
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase().trim();
    return s === 'si' || s === 'true' || s === '1' || s === 'yes';
  }

  confirmImport() {
    if (this.hasErrors() || this.isProcessing()) return;
    this.isProcessing.set(true);
    const suppliers = this.rows().map(r => ({ name: r.name, ruc: r.ruc, email: r.email, phone: r.phone, contactName: r.contactName, isActive: r.isActive }));
    this.supplierService.bulkImport(suppliers).subscribe({
      next: (res) => { this.toastService.success(`Se importaron ${res.count} proveedores.`); this.isProcessing.set(false); this.isOpen.set(false); this.imported.emit(); },
      error: (err) => { this.toastService.error(err.message || 'Error en la importación'); this.isProcessing.set(false); }
    });
  }
}
