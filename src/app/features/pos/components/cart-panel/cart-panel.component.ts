import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Output,
  EventEmitter,
  signal,
  HostListener,
  ElementRef,
  effect,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTrash2,
  lucideMinus,
  lucidePlus,
  lucideUser,
  lucidePercent,
  lucideMessageSquare,
  lucideShoppingCart,
  lucideX,
  lucideChevronRight,
  lucidePencil,
} from '@ng-icons/lucide';
import { PosCartService } from '../../services/pos-cart.service';
import { PosCartItem } from '../../models/pos.models';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-cart-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent, CurrencyPipe],
  providers: [
    provideIcons({
      lucideTrash2,
      lucideMinus,
      lucidePlus,
      lucideUser,
      lucidePercent,
      lucideMessageSquare,
      lucideShoppingCart,
      lucideX,
      lucideChevronRight,
      lucidePencil,
    }),
  ],
  styleUrls: ['./cart-panel.component.scss'],
  template: `
    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="cart-panel__header">
      <div>
        <h2 class="cart-panel__title">
          Venta actual
          @if (cart.totals().itemCount > 0) {
            <span class="cart-panel__item-count">{{ cart.totals().itemCount }}</span>
          }
        </h2>
        <p class="cart-panel__subtitle">
          Cliente:
          <button class="cart-panel__customer-link" (click)="selectCustomer.emit()">
            {{ cart.customer()?.name || 'Consumidor final' }}
          </button>
        </p>
      </div>

      <!-- #4 — clear with undo toast instead of direct clear -->
      <button
        class="cart-panel__icon-btn cart-panel__icon-btn--danger"
        type="button"
        title="Vaciar carrito"
        [disabled]="cart.isEmpty()"
        (click)="clearWithUndo()"
      >
        <ng-icon name="lucideTrash2" size="16" />
      </button>
    </div>

    <!-- ── Items list ──────────────────────────────────────────────────── -->
    @if (cart.isEmpty()) {
      <div class="cart-panel__empty">
        <ng-icon name="lucideShoppingCart" size="40" />
        <div>
          <p class="cart-panel__empty-title">Sin productos</p>
          <p class="cart-panel__empty-sub">Selecciona del catálogo para comenzar</p>
        </div>
      </div>
    } @else {
      <div class="cart-panel__items">
        @for (item of cart.items(); track item.uid; let idx = $index) {
          <div
            class="cart-panel__item"
            [class.cart-panel__item--selected]="cart.selectedItemUid() === item.uid"
            (click)="toggleItem(item.uid)"
          >
            <div class="cart-panel__item-top">
              <!-- Qty badge: hidden when selected (stepper replaces it) -->
              @if (cart.selectedItemUid() !== item.uid) {
                <div
                  class="cart-panel__qty-badge"
                  [class.cart-panel__qty-badge--bounce]="bouncingUid() === item.uid"
                >{{ item.quantity }}x</div>
              }

              <div class="cart-panel__item-info">
                <span class="cart-panel__item-name">{{ item.productName }}</span>
                @if (item.variantName !== item.productName) {
                  <span class="cart-panel__item-variant">{{ item.variantName }}</span>
                }
                @if (item.sku && cart.selectedItemUid() === item.uid) {
                  <span class="cart-panel__item-sku">SKU: {{ item.sku }}</span>
                }
              </div>

              <span class="cart-panel__line-total">
                {{ cart.getLineTotal(item) | currency: 'USD':'symbol':'1.2-2' }}
              </span>

              <button
                class="cart-panel__remove-btn"
                type="button"
                title="Eliminar"
                (click)="cart.removeItem(item.uid); $event.stopPropagation()"
              >
                <ng-icon name="lucideX" size="14" />
              </button>
            </div>

            <!-- Modifiers -->
            @if (item.selectedModifiers.length > 0) {
              <div class="cart-panel__item-modifiers">
                @for (mod of item.selectedModifiers; track mod.optionId) {
                  <span class="cart-panel__modifier-badge">{{ mod.optionName }}</span>
                }
              </div>
            }

            <!-- Hint (collapsed items, touch devices only via CSS) -->
            @if (cart.selectedItemUid() !== item.uid) {
              <span class="cart-panel__expand-hint">Pulsa para editar</span>
            }

            <!-- Expanded controls (selected) -->
            @if (cart.selectedItemUid() === item.uid) {
              <div class="cart-panel__item-expanded">
                <!-- Edit button (only for items with modifiers or combos) -->
                @if (item.selectedModifiers.length > 0 || item.chosenVariants.length > 0) {
                  <button
                    class="cart-panel__edit-btn"
                    type="button"
                    (click)="editItem.emit(item.uid); $event.stopPropagation()"
                  >
                    <ng-icon name="lucidePencil" size="14" />
                    <span>Editar opciones</span>
                  </button>
                }

                <!-- Row 1: Stepper + unit price -->
                <div class="cart-panel__item-row">
                  <div class="cart-panel__qty" (click)="$event.stopPropagation()">
                    <button
                      class="cart-panel__qty-btn"
                      type="button"
                      (click)="changeQuantity(item.uid, item.quantity - 1)"
                    >
                      <ng-icon name="lucideMinus" size="16" />
                    </button>
                    <input
                      class="cart-panel__qty-input"
                      type="number"
                      min="1"
                      [ngModel]="item.quantity"
                      (ngModelChange)="onQuantityInput(item.uid, $event)"
                      (focus)="$any($event.target).select()"
                      aria-label="Cantidad"
                    />
                    <button
                      class="cart-panel__qty-btn"
                      type="button"
                      (click)="changeQuantity(item.uid, item.quantity + 1)"
                    >
                      <ng-icon name="lucidePlus" size="16" />
                    </button>
                  </div>
                  <span class="cart-panel__unit-price">{{ item.unitPrice | currency: 'USD':'symbol':'1.2-2' }}/u</span>
                </div>

                <!-- Row 2: Discount chip toggle -->
                <div class="cart-panel__item-row cart-panel__item-row--end" (click)="$event.stopPropagation()">
                  @if (!discountOpen() && !item.discountPercent) {
                    <button
                      class="cart-panel__discount-chip"
                      type="button"
                      (click)="discountOpen.set(true)"
                    >
                      <ng-icon name="lucidePercent" size="12" />
                      <span>Dto.</span>
                    </button>
                  } @else {
                    <div class="cart-panel__discount">
                      <ng-icon name="lucidePercent" size="12" />
                      <input
                        class="cart-panel__discount-input"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        aria-label="Porcentaje de descuento"
                        [ngModel]="item.discountPercent"
                        (ngModelChange)="onDiscountChange(item.uid, $event)"
                        (keydown)="blockInvalidDiscount($event)"
                        placeholder="0"
                      />
                      <span class="cart-panel__discount-suffix">%</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- ── Totals + Pay ────────────────────────────────────────────────── -->
    <div class="cart-panel__footer">
      @if (!cart.isEmpty()) {
        <div class="cart-panel__totals">
          <div class="cart-panel__totals-row">
            <span>Subtotal</span>
            <span>{{ cart.totals().subtotal | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>

          @if (cart.totals().totalDiscount > 0) {
            <div class="cart-panel__totals-row cart-panel__totals-row--discount">
              <span>Descuento</span>
              <span>-{{ cart.totals().totalDiscount | currency: 'USD':'symbol':'1.2-2' }}</span>
            </div>
          }

          <div class="cart-panel__totals-row">
            <span>Impuestos</span>
            <span>{{ cart.totals().totalTaxes | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>

          <div class="cart-panel__totals-row cart-panel__totals-row--total">
            <span class="cart-panel__totals-label">Total a pagar</span>
            <span class="cart-panel__totals-value">{{ cart.totals().total | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>
        </div>

        <!-- Notes as popover (doesn't push pay button) -->
        <div class="cart-panel__notes">
          <button
            class="cart-panel__notes-toggle"
            [class.cart-panel__notes-toggle--active]="notesOpen()"
            type="button"
            (click)="notesOpen.set(!notesOpen())"
          >
            <ng-icon name="lucideMessageSquare" size="14" />
            <span>{{ cart.notes() ? 'Editar notas' : 'Agregar notas' }}</span>
          </button>

          @if (notesOpen()) {
            <div class="cart-panel__notes-popover">
              <textarea
                class="cart-panel__notes-input"
                rows="2"
                placeholder="Notas de la venta..."
                [ngModel]="cart.notes()"
                (ngModelChange)="cart.setNotes($event)"
              ></textarea>
            </div>
          }
        </div>
      }

      <!-- Pay button shows total amount + keyboard hint -->
      <button
        class="cart-panel__pay-btn"
        type="button"
        [disabled]="cart.isEmpty()"
        (click)="pay.emit()"
      >
        <span>Cobrar</span>
        @if (!cart.isEmpty()) {
          <span class="cart-panel__pay-amount">
            {{ cart.totals().total | currency: 'USD':'symbol':'1.2-2' }}
          </span>
        }
        <span class="cart-panel__kbd">F2</span>
      </button>
    </div>
  `,
})
export class CartPanelComponent {
  protected readonly cart = inject(PosCartService);
  private readonly toast = inject(ToastService);
  private readonly elRef = inject(ElementRef);

  protected readonly notesOpen = signal(false);
  protected readonly discountOpen = signal(false);
  protected readonly bouncingUid = signal<string | null>(null);

  @Output() pay = new EventEmitter<void>();
  @Output() selectCustomer = new EventEmitter<void>();
  @Output() editItem = new EventEmitter<string>();

  constructor() {
    // Autofocus quantity input when an item is selected
    effect(() => {
      const uid = this.cart.selectedItemUid();
      if (uid) {
        setTimeout(() => this.focusQtyInput(), 50);
      }
    });
  }

  toggleItem(uid: string): void {
    const isSelected = this.cart.selectedItemUid() === uid;
    this.cart.selectItem(isSelected ? null : uid);
    this.discountOpen.set(false);
  }

  // #4 — Clear cart with undo via toast
  clearWithUndo(): void {
    const snapshot = this.cart.items();
    const customer = this.cart.customer();
    const notes = this.cart.notes();
    this.cart.clear();

    this.toast.showWithUndo('Carrito vaciado', () => {
      for (const item of snapshot) {
        this.cart.addItem(item);
      }
      if (customer) this.cart.setCustomer(customer);
      if (notes) this.cart.setNotes(notes);
    });
  }

  // #6 — Quantity change with bounce feedback
  changeQuantity(uid: string, qty: number): void {
    this.cart.updateQuantity(uid, qty);
    this.bouncingUid.set(null);
    // Force re-trigger animation by resetting in next microtask
    requestAnimationFrame(() => this.bouncingUid.set(uid));
    setTimeout(() => this.bouncingUid.set(null), 260);
  }

  // Direct quantity input (tap to type)
  onQuantityInput(uid: string, value: number): void {
    const qty = Math.max(0, Math.floor(value ?? 0));
    this.cart.updateQuantity(uid, qty);
  }

  // Block minus sign, decimal, and 'e' in discount input
  blockInvalidDiscount(e: KeyboardEvent): void {
    if (e.key === '-' || e.key === '.' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  }

  // #3 — Clamped discount input (real-time)
  onDiscountChange(uid: string, value: number): void {
    const num = value ?? 0;
    const clamped = Math.min(100, Math.max(0, Math.round(num)));
    this.cart.updateDiscount(uid, clamped);
  }

  // #12 — Keyboard shortcuts for +/- on selected item
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const selected = this.cart.selectedItemUid();
    if (!selected) return;

    const item = this.cart.items().find(i => i.uid === selected);
    if (!item) return;

    if (e.key === '+' || e.key === '=') {
      // Don't capture if user is typing in an input
      if (this.isInputFocused()) return;
      e.preventDefault();
      this.changeQuantity(selected, item.quantity + 1);
    } else if (e.key === '-') {
      if (this.isInputFocused()) return;
      e.preventDefault();
      this.changeQuantity(selected, item.quantity - 1);
    } else if (e.key === 'Delete') {
      if (this.isInputFocused()) return;
      e.preventDefault();
      this.cart.removeItem(selected);
      this.cart.selectItem(null);
    }
  }

  private focusQtyInput(): void {
    const input = this.elRef.nativeElement.querySelector('.cart-panel__qty-input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }

  private isInputFocused(): boolean {
    const el = document.activeElement;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  }
}
