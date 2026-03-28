import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBanknote,
  lucideCreditCard,
  lucideRefreshCw,
  lucideX,
  lucideCheck,
  lucidePlus,
  lucideLoader,
  lucideDelete,
  lucideSmartphone,
  lucideKeyboard,
  lucideWalletCards,
} from '@ng-icons/lucide';
import { PosCartService } from '../../services/pos-cart.service';
import { PosPaymentEntry } from '../../models/pos.models';
import {
  PaymentMethod,
  PAYMENT_METHODS,
  CreateSalePaymentPayload,
} from '../../../../core/models/sale.models';

interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  label: string;
  amount: number;
  reference?: string;
}

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent, CurrencyPipe],
  providers: [
    provideIcons({
      lucideBanknote,
      lucideCreditCard,
      lucideRefreshCw,
      lucideX,
      lucideCheck,
      lucidePlus,
      lucideLoader,
      lucideDelete,
      lucideSmartphone,
      lucideKeyboard,
      lucideWalletCards,
    }),
  ],
  styleUrls: ['./payment-dialog.component.scss'],
  template: `
    <div class="pay">
      <!-- ── Header: total ─────────────────────────────────────── -->
      <div class="pay__total-bar">
        <span class="pay__total-label">Total de la venta</span>
        <span class="pay__total-amount">{{ cart.totals().total | currency: 'USD' }}</span>
      </div>

      <!-- ── Body: two-column in touch, single in desktop ───────── -->
      <div class="pay__body">
        <!-- LEFT: keypad side (touch only) -->
        <div class="pay__keypad-side">
          <input
            #amountInput
            class="pay__amount-input"
            type="text"
            inputmode="decimal"
            placeholder="0.00"
            [ngModel]="keypadBuffer()"
            (ngModelChange)="onAmountInput($event)"
            (keydown.enter)="addPayment()"
            autofocus
          />

          <div class="pay__bills">
            @for (bill of bills; track bill) {
              <button class="pay__bill" type="button" (click)="onBill(bill)">
                {{ '$' + bill }}
              </button>
            }
          </div>
          <button class="pay__exact-btn" type="button" (click)="setExactAmount()">
            Monto exacto
          </button>

          <div class="pay__grid">
            @for (key of numKeys; track key) {
              <button class="pay__key" type="button" (click)="onKey(key)">{{ key }}</button>
            }
          </div>
          <div class="pay__grid pay__grid--bottom">
            <button class="pay__key pay__key--clear" type="button" (click)="onClearKeypad()">C</button>
            <button class="pay__key" type="button" (click)="onKey('0')">0</button>
            <button class="pay__key pay__key--dot" type="button" (click)="onKey('.')">.</button>
            <button class="pay__key pay__key--backspace" type="button" (click)="onBackspace()">
              <ng-icon name="lucideDelete" size="18" />
            </button>
          </div>
        </div>

        <!-- RIGHT: payment flow -->
        <div class="pay__flow-side">
          <!-- Amount input (desktop only, inline) -->
          <div class="pay__amount-desktop">
            <input
              class="pay__amount-input"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              [ngModel]="keypadBuffer()"
              (ngModelChange)="onAmountInput($event)"
              (keydown.enter)="addPayment()"
              autofocus
            />
            <div class="pay__bills">
              @for (bill of bills; track bill) {
                <button class="pay__bill" type="button" (click)="onBill(bill)">
                  {{ '$' + bill }}
                </button>
              }
              <button class="pay__bill pay__bill--exact" type="button" (click)="setExactAmount()">
                Exacto
              </button>
            </div>
          </div>

          <!-- Payment methods -->
          <div class="pay__methods">
            @for (method of paymentMethods; track method.value) {
              <button
                type="button"
                class="pay__method"
                [class.pay__method--active]="selectedMethod() === method.value"
                (click)="selectMethod(method.value)"
              >
                <ng-icon [name]="method.icon" size="18" />
                <span>{{ method.label }}</span>
              </button>
            }
          </div>

          @if (needsReference()) {
            <div class="pay__ref-field">
              <label class="pay__ref-label">{{ referenceLabel() }}</label>
              <input
                type="text"
                class="pay__ref-input"
                [ngModel]="currentReference()"
                (ngModelChange)="currentReference.set($event)"
                [placeholder]="referencePlaceholder()"
              />
            </div>
          }

          <button
            type="button"
            class="pay__add-btn"
            [disabled]="!canAddPayment()"
            (click)="addPayment()"
          >
            <ng-icon name="lucidePlus" size="16" />
            Agregar pago
          </button>

          @if (payments().length > 0) {
            <div class="pay__list">
              <div class="pay__list-title">Pagos registrados</div>
              @for (payment of payments(); track payment.id) {
                <div class="pay__list-item">
                  <div>
                    <span class="pay__list-method">{{ payment.label }}</span>
                    @if (payment.reference) {
                      <span class="pay__list-ref">{{ payment.reference }}</span>
                    }
                  </div>
                  <div class="pay__list-right">
                    <span class="pay__list-amount">{{ payment.amount | currency: 'USD' }}</span>
                    <button class="pay__list-remove" (click)="removePayment(payment.id)">
                      <ng-icon name="lucideX" size="14" />
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

    </div>
  `,
})
export class PaymentDialogComponent {
  protected readonly cart = inject(PosCartService);

  @Input() isProcessing = false;
  @Output() confirm = new EventEmitter<CreateSalePaymentPayload[]>();
  @Output() cancel = new EventEmitter<void>();

  readonly paymentMethods = PAYMENT_METHODS;
  readonly numKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
  readonly bills = [1, 5, 10, 20, 50, 100];

  // ── State ──────────────────────────────────────────────────────────────
  readonly payments = signal<PaymentEntry[]>([]);
  readonly selectedMethod = signal<PaymentMethod>('EFECTIVO');
  readonly currentReference = signal('');
  readonly keypadBuffer = signal('');
  readonly forceTouch = signal(false);

  // ── Computed ────────────────────────────────────────────────────────────
  readonly keypadValue = computed(() => {
    const v = parseFloat(this.keypadBuffer());
    return isNaN(v) ? 0 : this.round2(v);
  });

  readonly totalPaid = computed(() =>
    this.payments().reduce((sum, p) => sum + p.amount, 0),
  );

  readonly remaining = computed(() => {
    const diff = this.round2(this.cart.totals().total - this.totalPaid());
    return diff > 0 ? diff : 0;
  });

  readonly change = computed(() => {
    const diff = this.round2(this.totalPaid() - this.cart.totals().total);
    return diff > 0 ? diff : 0;
  });

  readonly canConfirm = computed(
    () => this.totalPaid() >= this.cart.totals().total && !this.isProcessing,
  );

  readonly canAddPayment = computed(() => this.keypadValue() > 0);

  readonly needsReference = computed(() => this.selectedMethod() !== 'EFECTIVO');

  readonly referenceLabel = computed(() => {
    const m = this.selectedMethod();
    if (m === 'TARJETA_DEBITO' || m === 'TARJETA_CREDITO' || m === 'TARJETA_PREPAGO') return 'Ultimos 4 digitos';
    if (m === 'TRANSFERENCIA') return 'No. referencia';
    if (m === 'DINERO_ELECTRONICO') return 'No. referencia';
    return 'Referencia';
  });

  readonly referencePlaceholder = computed(() => {
    const m = this.selectedMethod();
    if (m === 'TARJETA_DEBITO' || m === 'TARJETA_CREDITO' || m === 'TARJETA_PREPAGO') return '1234';
    if (m === 'TRANSFERENCIA' || m === 'DINERO_ELECTRONICO') return 'REF-001';
    return '';
  });

  private emitConfirm(): void {
    const payloads: CreateSalePaymentPayload[] = this.payments().map((p) => ({
      amount: p.amount,
      paymentMethod: p.method,
      ...(p.reference ? { reference: p.reference } : {}),
    }));
    this.confirm.emit(payloads);
  }

  // ── Amount input (keyboard) ──────────────────────────────────────────
  onAmountInput(value: string): void {
    // Allow only valid decimal input
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    this.keypadBuffer.set(cleaned);
  }

  // ── Keypad actions (touch) ──────────────────────────────────────────
  onKey(key: string): void {
    const current = this.keypadBuffer();
    if (key === '.' && current.includes('.')) return;
    // Limit decimal places to 2
    const dotIdx = current.indexOf('.');
    if (dotIdx >= 0 && current.length - dotIdx > 2) return;
    if (key === '.' && current === '') {
      this.keypadBuffer.set('0.');
      return;
    }
    this.keypadBuffer.set(current + key);
  }

  onBackspace(): void {
    const current = this.keypadBuffer();
    this.keypadBuffer.set(current.slice(0, -1));
  }

  onClearKeypad(): void {
    this.keypadBuffer.set('');
  }

  // ── Payment actions ────────────────────────────────────────────────────
  selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(method);
    this.currentReference.set('');
  }

  onBill(bill: number): void {
    this.keypadBuffer.set(bill.toFixed(2));
  }

  setExactAmount(): void {
    const amount = this.remaining() > 0 ? this.remaining() : this.cart.totals().total;
    this.keypadBuffer.set(amount.toFixed(2));
  }

  addPayment(): void {
    const amount = this.keypadValue();
    if (amount <= 0) return;

    const method = this.selectedMethod();
    const label = this.paymentMethods.find((m) => m.value === method)?.label ?? method;

    this.payments.update((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        method,
        label,
        amount,
        reference: this.currentReference() || undefined,
      },
    ]);

    this.keypadBuffer.set('');
    this.currentReference.set('');
  }

  removePayment(id: string): void {
    this.payments.update((list) => list.filter((p) => p.id !== id));
  }

  onConfirm(): void {
    // Auto-add if buffer has a value but no payment added yet
    if (this.payments().length === 0 && this.keypadValue() > 0) {
      this.addPayment();
    }

    if (this.totalPaid() < this.cart.totals().total) return;

    this.emitConfirm();
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
