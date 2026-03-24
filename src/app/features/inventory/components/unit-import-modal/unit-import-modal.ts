import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { UnitsService } from '../../../../core/services/units.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UnitType, UNIT_TYPE_LABELS } from '../../../../core/models/unit.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUploadCloud, lucideCheck } from '@ng-icons/lucide';
import * as Papa from 'papaparse';

interface ImportRow {
  name: string;
  abbreviation: string;
  type: UnitType;
  isActive?: boolean;
  errors?: string[];
}

@Component({
  selector: 'app-unit-import-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, SpinnerComponent, NgIconComponent],
  templateUrl: './unit-import-modal.html',
  styleUrls: ['./unit-import-modal.scss'],
  providers: [provideIcons({ lucideDownload, lucideUploadCloud, lucideCheck })]
})
export class UnitImportModalComponent {
  private unitsService = inject(UnitsService);
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
    const headers = ['Nombre (Obligatorio)', 'Abreviación (Obligatorio)', 'Tipo (UNIT/WEIGHT/VOLUME/OTHER)', '¿Activa? (SI/NO)'];
    const csvContent = headers.join(',') + '\nKilogramo,kg,WEIGHT,SI\nLitro,L,VOLUME,SI\nPieza,pza,UNIT,SI';
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_unidades.csv');
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
    const validTypes: string[] = ['UNIT', 'WEIGHT', 'VOLUME', 'OTHER'];

    const processedRows = data.map(item => {
      const rowErrors: string[] = [];
      const name = item['Nombre (Obligatorio)'] || item['Nombre'] || item['name'];
      const abbreviation = item['Abreviación (Obligatorio)'] || item['Abreviación'] || item['abbreviation'];
      const rawType = (item['Tipo (UNIT/WEIGHT/VOLUME/OTHER)'] || item['Tipo'] || item['type'] || 'UNIT').toUpperCase().trim();

      if (!name || name.trim().length < 2) {
        rowErrors.push('Nombre demasiado corto');
      }
      if (!abbreviation || abbreviation.trim().length === 0) {
        rowErrors.push('Abreviación requerida');
      }
      if (!validTypes.includes(rawType)) {
        rowErrors.push(`Tipo inválido: ${rawType}`);
      }

      const row: ImportRow = {
        name: name?.trim(),
        abbreviation: abbreviation?.trim(),
        type: validTypes.includes(rawType) ? rawType as UnitType : 'UNIT',
        isActive: this.parseBoolean(item['¿Activa? (SI/NO)'] || item['isActive']),
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

  typeLabel(type: UnitType): string {
    return UNIT_TYPE_LABELS[type] ?? type;
  }

  confirmImport() {
    if (this.hasErrors() || this.isProcessing()) return;
    this.isProcessing.set(true);

    const units = this.rows().map(r => ({
      name: r.name,
      abbreviation: r.abbreviation,
      type: r.type,
      isActive: r.isActive,
    }));

    this.unitsService.bulkImport(units).subscribe({
      next: (res) => {
        this.toastService.success(`Se importaron ${res.count} unidades correctamente.`);
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
