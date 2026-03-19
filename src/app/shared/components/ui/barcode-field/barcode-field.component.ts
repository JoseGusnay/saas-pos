import {
  Component, Input, signal, forwardRef,
  ViewChild, ElementRef, AfterViewInit, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideZap, lucidePrinter, lucideBarcode, lucideMinus, lucidePlus, lucideX } from '@ng-icons/lucide';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-barcode-field',
  standalone: true,
  templateUrl: './barcode-field.component.html',
  styleUrls: ['./barcode-field.component.scss'],
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BarcodeFieldComponent),
      multi: true
    },
    provideIcons({ lucideZap, lucidePrinter, lucideBarcode, lucideMinus, lucidePlus, lucideX })
  ]
})
export class BarcodeFieldComponent implements AfterViewInit {
  @Input() productName = '';
  @Input() salePrice: number | null = null;

  @ViewChild('barcodeRef') barcodeRef?: ElementRef<SVGElement>;

  value = signal('');
  isModalOpen = signal(false);
  copies = signal(1);
  printItems = signal<number[]>([]);

  disabled = false;
  onChange = (_: any) => {};
  onTouched = () => {};

  constructor() {
    effect(() => {
      if (this.isModalOpen() && this.value()) {
        setTimeout(() => this.renderPreviewBarcode(), 50);
      }
    });
  }

  ngAfterViewInit() {}

  writeValue(val: any): void { this.value.set(val || ''); }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
  }

  generate() {
    const code = this.generateEan13();
    this.value.set(code);
    this.onChange(code);
  }

  openModal() {
    this.copies.set(1);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  increaseCopies() { this.copies.update(c => Math.min(c + 1, 100)); }
  decreaseCopies() { this.copies.update(c => Math.max(c - 1, 1)); }

  onCopiesInput(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value) || 1;
    this.copies.set(Math.min(Math.max(val, 1), 100));
  }

  print() {
    const n = this.copies();
    this.printItems.set(Array.from({ length: n }, (_, i) => i));
    setTimeout(() => {
      this.renderPrintBarcodes();
      setTimeout(() => window.print(), 100);
    }, 50);
  }

  private renderPreviewBarcode() {
    if (!this.barcodeRef?.nativeElement || !this.value()) return;
    try {
      JsBarcode(this.barcodeRef.nativeElement, this.value(), {
        format: 'EAN13',
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000'
      });
    } catch (_) {}
  }

  private renderPrintBarcodes() {
    const svgs = document.querySelectorAll('[data-barcode-print]');
    svgs.forEach(svg => {
      try {
        JsBarcode(svg as SVGElement, this.value(), {
          format: 'EAN13',
          width: 1.8,
          height: 50,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (_) {}
    });
  }

  private generateEan13(): string {
    const prefix = '200';
    const middle = String(Date.now()).slice(-9).padStart(9, '0');
    const partial = prefix + middle;
    const check = this.ean13CheckDigit(partial);
    return partial + check;
  }

  private ean13CheckDigit(partial: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(partial[i]) * (i % 2 === 0 ? 1 : 3);
    }
    return String((10 - (sum % 10)) % 10);
  }
}
