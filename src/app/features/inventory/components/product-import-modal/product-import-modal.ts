import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { ProductService } from '../../services/product.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUploadCloud, lucideCheck, lucideChevronDown, lucideChevronRight } from '@ng-icons/lucide';
import * as Papa from 'papaparse';

interface ImportVariant {
  sku?: string;
  barcode?: string;
  variantName?: string;
  costPrice: number;
  salePrice: number;
  errors: string[];
}

interface ImportProductGroup {
  name: string;
  categoryName: string;
  type: string;
  description?: string;
  isActive: boolean;
  variants: ImportVariant[];
  errors: string[];
  expanded: boolean;
}

@Component({
  selector: 'app-product-import-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, SpinnerComponent, NgIconComponent],
  templateUrl: './product-import-modal.html',
  styleUrls: ['./product-import-modal.scss'],
  providers: [provideIcons({ lucideDownload, lucideUploadCloud, lucideCheck, lucideChevronDown, lucideChevronRight })]
})
export class ProductImportModalComponent {
  private productService = inject(ProductService);
  private toastService = inject(ToastService);

  @Output() imported = new EventEmitter<void>();

  isOpen = signal(false);
  step = signal(1);
  isProcessing = signal(false);
  products = signal<ImportProductGroup[]>([]);
  hasErrors = signal(false);

  open() {
    this.reset();
    this.isOpen.set(true);
  }

  close() {
    if (this.isProcessing()) return;
    this.isOpen.set(false);
  }

  reset() {
    this.step.set(1);
    this.isProcessing.set(false);
    this.products.set([]);
    this.hasErrors.set(false);
  }

  toggleExpanded(index: number) {
    this.products.update(list =>
      list.map((p, i) => i === index ? { ...p, expanded: !p.expanded } : p)
    );
  }

  get totalVariants(): number {
    return this.products().reduce((acc, p) => acc + p.variants.length, 0);
  }

  downloadTemplate() {
    const headers = [
      'Nombre (Obligatorio)',
      'Categoría (Obligatorio)',
      'Tipo (PHYSICAL/SERVICE)',
      'Descripción',
      'Nombre Variante',
      'SKU',
      'Código de Barras',
      'Precio de Costo',
      'Precio de Venta (Obligatorio)',
      '¿Activo? (SI/NO)'
    ];
    const rows = [
      // Producto físico con 3 variantes
      ['Camiseta Polo', 'Ropa', 'PHYSICAL', 'Camiseta de algodón', 'Talla S', 'CP-S', '7501000001', '10000', '15000', 'SI'],
      ['Camiseta Polo', '',    '',          '',                    'Talla M', 'CP-M', '7501000002', '10000', '15000', ''],
      ['Camiseta Polo', '',    '',          '',                    'Talla L', 'CP-L', '7501000003', '10000', '15000', ''],
      // Producto simple 1 variante
      ['Coca Cola 500ml', 'Bebidas', 'PHYSICAL', '', '', 'CC-500', '7500435000003', '800', '1200', 'SI'],
      // Servicio
      ['Corte de Cabello', 'Servicios', 'SERVICE', '', '', '', '', '0', '25000', 'SI'],
    ];
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'plantilla_productos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

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

  private processParsedData(rawData: any[]) {
    // Step 1: group rows by product name (case-insensitive)
    const groupMap = new Map<string, { rows: any[]; firstIndex: number }>();
    for (const item of rawData) {
      const name = (item['Nombre (Obligatorio)'] || item['Nombre'] || item['name'] || '').trim();
      const key = name.toLowerCase();
      if (!groupMap.has(key)) {
        groupMap.set(key, { rows: [], firstIndex: groupMap.size });
      }
      groupMap.get(key)!.rows.push(item);
    }

    // Step 2: collect all SKUs and barcodes in CSV for cross-group duplicate detection
    const allSkus: string[] = [];
    const allBarcodes: string[] = [];
    for (const { rows } of groupMap.values()) {
      for (const item of rows) {
        const sku = (item['SKU'] || item['sku'] || '').trim();
        const barcode = (item['Código de Barras'] || item['barcode'] || '').trim();
        if (sku) allSkus.push(sku);
        if (barcode) allBarcodes.push(barcode);
      }
    }

    let globalError = false;

    const groups: ImportProductGroup[] = [];
    for (const [, { rows }] of groupMap) {
      const firstRow = rows[0];
      const productErrors: string[] = [];

      const name = (firstRow['Nombre (Obligatorio)'] || firstRow['Nombre'] || firstRow['name'] || '').trim();
      if (!name || name.length < 2) productErrors.push('Nombre inválido (mínimo 2 caracteres)');

      const categoryName = (firstRow['Categoría (Obligatorio)'] || firstRow['Categoría'] || firstRow['categoryName'] || '').trim();
      if (!categoryName) productErrors.push('Categoría es obligatoria');

      const typeRaw = (firstRow['Tipo (PHYSICAL/SERVICE)'] || firstRow['Tipo'] || firstRow['type'] || 'PHYSICAL').trim().toUpperCase();
      const type = typeRaw === 'SERVICE' ? 'SERVICE' : 'PHYSICAL';

      // Parse variants from each row of this group
      const variants: ImportVariant[] = rows.map((item, rowIdx) => {
        const variantErrors: string[] = [];

        const salePriceRaw = item['Precio de Venta (Obligatorio)'] || item['Precio de Venta'] || item['salePrice'];
        const salePrice = parseFloat(String(salePriceRaw ?? '').replace(',', '.'));
        if (isNaN(salePrice) || salePrice < 0) variantErrors.push('Precio de Venta inválido');

        const costPriceRaw = item['Precio de Costo'] || item['costPrice'];
        const costPrice = parseFloat(String(costPriceRaw ?? '0').replace(',', '.'));

        const sku = (item['SKU'] || item['sku'] || '').trim() || undefined;
        const barcode = (item['Código de Barras'] || item['barcode'] || '').trim() || undefined;

        // Cross-group duplicate check
        if (sku && allSkus.filter(s => s === sku).length > 1) {
          variantErrors.push(`SKU '${sku}' duplicado en el archivo`);
        }
        if (barcode && allBarcodes.filter(b => b === barcode).length > 1) {
          variantErrors.push(`Código de barras '${barcode}' duplicado en el archivo`);
        }

        return {
          sku,
          barcode,
          variantName: (item['Nombre Variante'] || item['variantName'] || '').trim() || undefined,
          costPrice: isNaN(costPrice) ? 0 : costPrice,
          salePrice: isNaN(salePrice) ? 0 : salePrice,
          errors: variantErrors,
        };
      });

      const hasAnyError = productErrors.length > 0 || variants.some(v => v.errors.length > 0);
      if (hasAnyError) globalError = true;

      groups.push({
        name,
        categoryName,
        type,
        description: (firstRow['Descripción'] || firstRow['description'] || '').trim() || undefined,
        isActive: this.parseBoolean(firstRow['¿Activo? (SI/NO)'] || firstRow['isActive']),
        variants,
        errors: productErrors,
        expanded: hasAnyError, // auto-expand groups with errors
      });
    }

    this.products.set(groups);
    this.hasErrors.set(globalError);
  }

  private parseBoolean(val: any): boolean {
    if (typeof val === 'boolean') return val;
    const str = String(val ?? 'SI').toLowerCase().trim();
    return str === 'si' || str === 'true' || str === '1' || str === 'yes' || str === '';
  }

  confirmImport() {
    if (this.hasErrors() || this.isProcessing()) return;
    this.isProcessing.set(true);

    const payload = this.products().map(p => ({
      name: p.name,
      categoryName: p.categoryName,
      type: p.type,
      description: p.description,
      isActive: p.isActive,
      variants: p.variants.map(v => ({
        sku: v.sku,
        barcode: v.barcode,
        variantName: v.variantName,
        costPrice: v.costPrice,
        salePrice: v.salePrice,
      })),
    }));

    this.productService.bulkImport(payload).subscribe({
      next: (res) => {
        this.toastService.success(`¡Éxito! Se importaron ${res.count} productos.`);
        this.isProcessing.set(false);
        this.isOpen.set(false);
        this.imported.emit();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Error en la importación');
        this.isProcessing.set(false);
      }
    });
  }
}
