import { Injectable, computed, signal } from '@angular/core';
import { PosCartItem, PosCartItemTax, PosCartTotals } from '../models/pos.models';
import { SaleModifierSnapshot } from '../../../core/models/sale.models';
import { Customer } from '../../../core/models/customer.models';

@Injectable({ providedIn: 'root' })
export class PosCartService {
  // ── State ────────────────────────────────────────────────────────────────

  private readonly _items = signal<PosCartItem[]>([]);
  private readonly _customer = signal<Customer | null>(null);
  private readonly _notes = signal('');
  private readonly _selectedItemUid = signal<string | null>(null);

  // ── Public selectors ─────────────────────────────────────────────────────

  readonly items = this._items.asReadonly();
  readonly customer = this._customer.asReadonly();
  readonly notes = this._notes.asReadonly();
  readonly selectedItemUid = this._selectedItemUid.asReadonly();

  readonly totals = computed<PosCartTotals>(() => {
    const items = this._items();
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxes = 0;
    let itemCount = 0;

    for (const item of items) {
      const lineSubtotal = this.round2(item.unitPrice * item.quantity);
      const lineDiscount = this.round2(lineSubtotal * item.discountPercent / 100);
      const lineAfterDiscount = this.round2(lineSubtotal - lineDiscount);
      const lineTax = item.taxes.reduce(
        (sum, t) => sum + this.round2(lineAfterDiscount * t.taxRate / 100),
        0
      );

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;
      totalTaxes += lineTax;
      itemCount += item.quantity;
    }

    const subtotalAfterDiscount = this.round2(subtotal - totalDiscount);
    const total = this.round2(subtotalAfterDiscount + totalTaxes);

    return { subtotal, totalDiscount, subtotalAfterDiscount, totalTaxes, total, itemCount };
  });

  readonly isEmpty = computed(() => this._items().length === 0);

  // ── Cart Actions ─────────────────────────────────────────────────────────

  addItem(item: Omit<PosCartItem, 'uid'>): string {
    const uid = crypto.randomUUID();

    // If same variant with same modifiers and same combo choices exists, increase qty
    const existing = this._items().find(i =>
      i.variantId === item.variantId
      && this.sameModifiers(i.selectedModifiers, item.selectedModifiers)
      && this.sameChosenVariants(i.chosenVariants, item.chosenVariants)
    );

    if (existing) {
      this._items.update(items =>
        items.map(i => i.uid === existing.uid
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
        )
      );
      this._selectedItemUid.set(existing.uid);
      return existing.uid;
    } else {
      this._items.update(items => [...items, { ...item, uid }]);
      this._selectedItemUid.set(uid);
      return uid;
    }
  }

  selectItem(uid: string | null): void {
    this._selectedItemUid.set(uid);
  }

  removeItem(uid: string): void {
    this._items.update(items => items.filter(i => i.uid !== uid));
    if (this._selectedItemUid() === uid) {
      this._selectedItemUid.set(null);
    }
  }

  updateQuantity(uid: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(uid);
      return;
    }
    this._items.update(items =>
      items.map(i => i.uid === uid ? { ...i, quantity } : i)
    );
  }

  updateDiscount(uid: string, discountPercent: number): void {
    this._items.update(items =>
      items.map(i => i.uid === uid ? { ...i, discountPercent: Math.min(100, Math.max(0, discountPercent)) } : i)
    );
  }

  setCustomer(customer: Customer | null): void {
    this._customer.set(customer);
  }

  setNotes(notes: string): void {
    this._notes.set(notes);
  }

  clear(): void {
    this._items.set([]);
    this._customer.set(null);
    this._notes.set('');
    this._selectedItemUid.set(null);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getLineTotal(item: PosCartItem): number {
    const sub = this.round2(item.unitPrice * item.quantity);
    const disc = this.round2(sub * item.discountPercent / 100);
    const afterDisc = this.round2(sub - disc);
    const tax = item.taxes.reduce(
      (sum, t) => sum + this.round2(afterDisc * t.taxRate / 100),
      0
    );
    return this.round2(afterDisc + tax);
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private sameModifiers(a: SaleModifierSnapshot[], b: SaleModifierSnapshot[]): boolean {
    if (a.length !== b.length) return false;
    const keyA = a.map(m => m.optionId).sort().join(',');
    const keyB = b.map(m => m.optionId).sort().join(',');
    return keyA === keyB;
  }

  private sameChosenVariants(
    a: { comboItemId: string; variantId: string }[],
    b: { comboItemId: string; variantId: string }[]
  ): boolean {
    if (a.length !== b.length) return false;
    const keyA = a.map(c => `${c.comboItemId}:${c.variantId}`).sort().join(',');
    const keyB = b.map(c => `${c.comboItemId}:${c.variantId}`).sort().join(',');
    return keyA === keyB;
  }
}
