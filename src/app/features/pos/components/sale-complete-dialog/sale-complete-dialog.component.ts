import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideReceipt,
} from '@ng-icons/lucide';
import { Sale, PAYMENT_METHODS } from '../../../../core/models/sale.models';

@Component({
  selector: 'app-sale-complete-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, CurrencyPipe, DatePipe],
  providers: [
    provideIcons({
      lucideCheckCircle2,
      lucideReceipt,
    }),
  ],
  styleUrl: './sale-complete-dialog.component.scss',
  template: `
    @if (sale) {
      <div class="sale-complete">
        <!-- Success Icon -->
        <div class="sale-complete__icon">
          <ng-icon name="lucideCheckCircle2" size="64" />
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

        <div class="sale-complete__actions">
          <button class="btn btn-primary btn-lg" (click)="newSale.emit()">
            <ng-icon name="lucideReceipt" size="18" />
            Nueva Venta
          </button>
        </div>
      </div>
    }
  `,
})
export class SaleCompleteDialogComponent {
  @Input() sale: Sale | null = null;

  @Output() newSale = new EventEmitter<void>();
  @Output() printReceipt = new EventEmitter<void>();

  getPaymentLabel(method: string): string {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
  }
}
