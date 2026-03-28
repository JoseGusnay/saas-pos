import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideReceipt,
  lucideDownload,
  lucideRefreshCw,
  lucideAlertCircle,
  lucideLoader,
  lucideClock,
  lucideFileCheck,
} from '@ng-icons/lucide';
import { Sale, PAYMENT_METHODS } from '../../../../core/models/sale.models';
import { FiscalService } from '../../../../core/services/fiscal.service';
import { FiscalStateService } from '../../../../core/services/fiscal-state.service';
import { ElectronicDocument } from '../../../../core/models/fiscal.models';

@Component({
  selector: 'app-sale-complete-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, CurrencyPipe, DatePipe],
  providers: [
    provideIcons({
      lucideCheckCircle2,
      lucideReceipt,
      lucideDownload,
      lucideRefreshCw,
      lucideAlertCircle,
      lucideLoader,
      lucideClock,
      lucideFileCheck,
    }),
  ],
  styleUrl: './sale-complete-dialog.component.scss',
  template: `
    @if (sale) {
      <div class="sale-complete">
        <!-- Success Icon -->
        <div class="sale-complete__icon">
          <ng-icon name="lucideCheckCircle2" size="40" />
        </div>

        <h2 class="sale-complete__title">Venta completada</h2>
        <div class="sale-complete__number">{{ sale.saleNumber }}</div>
        <div class="sale-complete__date">
          {{ sale.createdAt | date: 'dd/MM/yyyy HH:mm' }}
        </div>

        <!-- Summary -->
        <div class="sale-complete__summary">
          <div class="sale-complete__summary-row">
            <span>Productos</span>
            <span>{{ sale.items.length }} {{ sale.items.length === 1 ? 'item' : 'items' }}</span>
          </div>
          <div class="sale-complete__summary-row">
            <span>Subtotal</span>
            <span>{{ sale.subtotal | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>
          @if (sale.totalDiscount > 0) {
            <div class="sale-complete__summary-row sale-complete__summary-row--discount">
              <span>Descuento</span>
              <span>-{{ sale.totalDiscount | currency: 'USD':'symbol':'1.2-2' }}</span>
            </div>
          }
          @if (sale.totalTaxes > 0) {
            <div class="sale-complete__summary-row">
              <span>Impuestos</span>
              <span>{{ sale.totalTaxes | currency: 'USD':'symbol':'1.2-2' }}</span>
            </div>
          }
          <div class="sale-complete__summary-row sale-complete__total">
            <span>TOTAL</span>
            <span>{{ sale.total | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>
        </div>

        @if (sale.change > 0) {
          <div class="sale-complete__change">
            <span>Cambio</span>
            <span>{{ sale.change | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>
        }

        @if (sale.payments.length > 0) {
          <div class="sale-complete__payments">
            <div class="sale-complete__payments-title">Pagos recibidos</div>
            @for (payment of sale.payments; track payment.id) {
              <div class="sale-complete__payment-item">
                <span class="sale-complete__payment-method">
                  {{ getPaymentLabel(payment.paymentMethod) }}
                </span>
                <span class="sale-complete__payment-amount">
                  {{ payment.amount | currency: 'USD':'symbol':'1.2-2' }}
                </span>
              </div>
            }
          </div>
        }

        @if (sale.customerName) {
          <div class="sale-complete__customer">
            <span class="sale-complete__customer-label">Cliente</span>
            <span class="sale-complete__customer-name">{{ sale.customerName }}</span>
          </div>
        }

        <!-- Invoice Status -->
        @if (fiscalState.facturacionElectronica()) {
          <div class="sale-complete__invoice">
            <div class="sale-complete__invoice-title">Factura electrónica</div>

            @if (loadingEdoc()) {
              <div class="sale-complete__invoice-status sale-complete__invoice-status--loading">
                <ng-icon name="lucideLoader" size="16" />
                <span>Procesando...</span>
              </div>
            } @else if (edoc()) {
              <div class="sale-complete__invoice-status"
                   [class.sale-complete__invoice-status--autorizado]="edoc()!.estado === 'AUTORIZADO'"
                   [class.sale-complete__invoice-status--rechazado]="edoc()!.estado === 'RECHAZADO'"
                   [class.sale-complete__invoice-status--pendiente]="edoc()!.estado !== 'AUTORIZADO' && edoc()!.estado !== 'RECHAZADO'">
                @switch (edoc()!.estado) {
                  @case ('AUTORIZADO') {
                    <ng-icon name="lucideFileCheck" size="16" />
                    <span>Autorizada</span>
                  }
                  @case ('RECHAZADO') {
                    <ng-icon name="lucideAlertCircle" size="16" />
                    <span>Rechazada</span>
                  }
                  @default {
                    <ng-icon name="lucideClock" size="16" />
                    <span>{{ edoc()!.estado }}</span>
                  }
                }
              </div>

              <div class="sale-complete__invoice-number">
                {{ edoc()!.establecimiento }}-{{ edoc()!.puntoEmision }}-{{ edoc()!.secuencial }}
              </div>

              <div class="sale-complete__invoice-actions">
                @if (edoc()!.estado === 'AUTORIZADO') {
                  <button class="btn btn-sm btn-outline" (click)="onDownloadRide()" [disabled]="downloadingRide()">
                    <ng-icon name="lucideDownload" size="14" />
                    {{ downloadingRide() ? 'Descargando...' : 'Descargar RIDE' }}
                  </button>
                }
                @if (edoc()!.estado !== 'AUTORIZADO' && edoc()!.estado !== 'RECHAZADO') {
                  <button class="btn btn-sm btn-outline" (click)="onRefreshStatus()" [disabled]="loadingEdoc()">
                    <ng-icon name="lucideRefreshCw" size="14" />
                    Actualizar estado
                  </button>
                }
              </div>
            } @else {
              <div class="sale-complete__invoice-status sale-complete__invoice-status--pendiente">
                <ng-icon name="lucideClock" size="16" />
                <span>Pendiente de generación</span>
              </div>
            }
          </div>
        }

      </div>
    }
  `,
})
export class SaleCompleteDialogComponent implements OnChanges {
  private readonly fiscalService = inject(FiscalService);
  protected readonly fiscalState = inject(FiscalStateService);

  @Input() sale: Sale | null = null;

  @Output() newSale = new EventEmitter<void>();
  @Output() printReceipt = new EventEmitter<void>();

  readonly edoc = signal<ElectronicDocument | null>(null);
  readonly loadingEdoc = signal(false);
  readonly downloadingRide = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sale'] && this.sale) {
      this.edoc.set(null);
      if (this.fiscalState.facturacionElectronica()) {
        this.loadInvoiceStatus();
      }
    }
  }

  getPaymentLabel(method: string): string {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
  }

  onRefreshStatus(): void {
    this.loadInvoiceStatus();
  }

  onDownloadRide(): void {
    const doc = this.edoc();
    if (!doc) return;

    this.downloadingRide.set(true);
    this.fiscalService.downloadRide(doc.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RIDE-${doc.establecimiento}-${doc.puntoEmision}-${doc.secuencial}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingRide.set(false);
      },
      error: () => {
        this.downloadingRide.set(false);
      },
    });
  }

  private loadInvoiceStatus(): void {
    if (!this.sale) return;
    this.loadingEdoc.set(true);

    // Wait 2s to let backend process the invoice async
    setTimeout(() => {
      this.fiscalService.getComprobantesBySale(this.sale!.id).subscribe({
        next: (docs) => {
          const factura = docs.find(d => d.tipoComprobante === '01') ?? docs[0] ?? null;
          this.edoc.set(factura);
          this.loadingEdoc.set(false);
        },
        error: () => {
          this.loadingEdoc.set(false);
        },
      });
    }, 2000);
  }
}
