import {
  Component, Input, Output, EventEmitter, signal, computed,
  HostListener, ElementRef, ChangeDetectionStrategy, forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucideChevronLeft, lucideChevronRight, lucideX } from '@ng-icons/lucide';

const DAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface CalendarDay {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  dateStr: string;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ lucideCalendar, lucideChevronLeft, lucideChevronRight, lucideX }),
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true }
  ],
  template: `
    <div class="dp">
      <button #trigger type="button" class="dp__trigger" (click)="toggle(trigger)" [class.dp__trigger--open]="isOpen()">
        <ng-icon name="lucideCalendar" class="dp__icon"></ng-icon>
        <span class="dp__value" [class.dp__value--placeholder]="!value()">
          {{ value() ? formatDisplay(value()!) : placeholder }}
        </span>
        @if (value() && clearable) {
          <button type="button" class="dp__clear" (click)="clear($event)">
            <ng-icon name="lucideX"></ng-icon>
          </button>
        }
      </button>

      @if (isOpen() && !isMobile()) {
        <div class="dp__backdrop" (click)="close()"></div>
        <div class="dp__dropdown"
             [class.dp__dropdown--flipped]="dropdownPos()?.flipped"
             [style.top.px]="dropdownPos()?.top"
             [style.left.px]="dropdownPos()?.left"
             [style.bottom.px]="dropdownPos()?.bottom">
          <ng-container *ngTemplateOutlet="calendarTpl"></ng-container>
        </div>
      }

      @if (isOpen() && isMobile()) {
        <div class="dp__sheet-backdrop" (click)="close()"></div>
        <div class="dp__sheet">
          <div class="dp__sheet-handle"></div>
          <div class="dp__sheet-header">
            <span class="dp__sheet-title">{{ placeholder }}</span>
            <button type="button" class="dp__sheet-close" (click)="close()">
              <ng-icon name="lucideX"></ng-icon>
            </button>
          </div>
          <div class="dp__sheet-body">
            <ng-container *ngTemplateOutlet="calendarTpl"></ng-container>
          </div>
        </div>
      }
    </div>

    <ng-template #calendarTpl>
      <div class="dp__header">
        <button type="button" class="dp__nav" (click)="prevMonth()">
          <ng-icon name="lucideChevronLeft"></ng-icon>
        </button>
        <span class="dp__month-year">{{ monthName() }} {{ viewYear() }}</span>
        <button type="button" class="dp__nav" (click)="nextMonth()">
          <ng-icon name="lucideChevronRight"></ng-icon>
        </button>
      </div>

      <div class="dp__weekdays">
        @for (day of weekdays; track day) {
          <span class="dp__weekday">{{ day }}</span>
        }
      </div>

      <div class="dp__days">
        @for (day of calendarDays(); track day.dateStr) {
          <button
            type="button"
            class="dp__day"
            [class.dp__day--other]="!day.isCurrentMonth"
            [class.dp__day--today]="day.isToday"
            [class.dp__day--selected]="day.isSelected"
            [class.dp__day--past]="day.isPast && disablePast"
            [disabled]="day.isPast && disablePast"
            (click)="selectDay(day)"
          >
            {{ day.date }}
          </button>
        }
      </div>

      <div class="dp__footer">
        <button type="button" class="dp__today-btn" (click)="goToday()">Hoy</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .dp { position: relative; width: 100%; }

    .dp__trigger {
      display: flex; align-items: center; gap: 0.5rem; width: 100%;
      padding: 0.5rem 0.75rem; box-sizing: border-box;
      border: 1.5px solid var(--color-border-light); border-radius: var(--radius-md);
      background: var(--color-bg-surface); cursor: pointer; font-family: inherit;
      transition: border-color var(--transition-fast);
      &:hover { border-color: var(--color-border-medium, var(--color-text-muted)); }
      &--open { border-color: var(--color-accent-primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08); }
    }

    .dp__icon { color: var(--color-text-muted); font-size: 14px; flex-shrink: 0; }

    .dp__value {
      flex: 1; text-align: left; font-size: var(--font-size-sm); color: var(--color-text-main);
      &--placeholder { color: var(--color-text-muted); }
    }

    .dp__clear {
      display: flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border: none; border-radius: 50%; padding: 0;
      background: var(--color-border-subtle); color: var(--color-text-muted);
      cursor: pointer; font-size: 10px;
      &:hover { background: var(--color-border-light); color: var(--color-text-main); }
    }

    /* ── Desktop: fixed dropdown ─────────────────────────────── */
    .dp__backdrop {
      position: fixed; inset: 0; z-index: 9998;
    }

    .dp__dropdown {
      position: fixed; z-index: 9999;
      width: 280px; padding: 12px;
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
      animation: dpSlideIn 0.15s ease-out;

      &--flipped { animation: dpSlideUp 0.15s ease-out; }
    }

    @keyframes dpSlideIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes dpSlideUp {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Mobile: bottom sheet ────────────────────────────────── */
    .dp__sheet-backdrop {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(0, 0, 0, 0.4);
      animation: dpFadeIn 0.2s ease;
    }

    .dp__sheet {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: var(--color-bg-surface);
      border-radius: 16px 16px 0 0;
      animation: dpSheetUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    .dp__sheet-handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: var(--color-border-light); margin: 8px auto 0;
    }

    .dp__sheet-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 8px;
    }

    .dp__sheet-title {
      font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
      color: var(--color-text-main);
    }

    .dp__sheet-close {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border: none; border-radius: 50%;
      background: var(--color-bg-hover); color: var(--color-text-muted);
      cursor: pointer; font-size: 14px;
      &:hover { background: var(--color-border-light); }
    }

    .dp__sheet-body { padding: 8px 20px 20px; }

    @keyframes dpFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes dpSheetUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    /* ── Calendar shared (used in both modes) ────────────────── */
    .dp__header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }

    .dp__month-year {
      font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
      color: var(--color-text-main);
    }

    .dp__nav {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border: none; border-radius: var(--radius-sm);
      background: transparent; color: var(--color-text-muted); cursor: pointer;
      font-size: 14px;
      &:hover { background: var(--color-bg-hover); color: var(--color-text-main); }
    }

    .dp__weekdays {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 0;
      margin-bottom: 4px;
    }

    .dp__weekday {
      text-align: center; font-size: 10px; font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted); text-transform: uppercase; padding: 4px 0;
    }

    .dp__days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }

    .dp__day {
      display: flex; align-items: center; justify-content: center;
      width: 100%; aspect-ratio: 1; border: none; border-radius: var(--radius-sm);
      background: transparent; color: var(--color-text-main); cursor: pointer;
      font-size: var(--font-size-xs); font-family: inherit;
      transition: all 0.1s;
      &:hover:not(:disabled) { background: var(--color-bg-hover); }
      &--other { color: var(--color-text-muted); opacity: 0.4; }
      &--today { font-weight: var(--font-weight-bold); color: var(--color-accent-primary); }
      &--selected {
        background: var(--color-accent-primary) !important; color: #fff !important;
        font-weight: var(--font-weight-semibold);
      }
      &--past { opacity: 0.3; cursor: not-allowed; }
    }

    .dp__footer {
      display: flex; justify-content: center; margin-top: 8px;
      border-top: 1px solid var(--color-border-subtle); padding-top: 8px;
    }

    .dp__today-btn {
      border: none; background: transparent; color: var(--color-accent-primary);
      font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
      cursor: pointer; padding: 4px 12px; border-radius: var(--radius-sm);
      font-family: inherit;
      &:hover { background: rgba(79, 70, 229, 0.06); }
    }
  `]
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() placeholder = 'Seleccionar fecha...';
  @Input() clearable = true;
  @Input() disablePast = false;

  readonly weekdays = DAYS_ES;

  value = signal<string | null>(null);
  isOpen = signal(false);
  isMobile = signal(false);
  dropdownPos = signal<{ top: number | null; left: number; bottom: number | null; flipped: boolean } | null>(null);
  viewMonth = signal(new Date().getMonth());
  viewYear = signal(new Date().getFullYear());

  monthName = computed(() => MONTHS_ES[this.viewMonth()]);

  calendarDays = computed<CalendarDay[]>(() => {
    const month = this.viewMonth();
    const year = this.viewYear();
    const today = new Date();
    const todayStr = this.toDateStr(today);
    const selected = this.value();

    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay() - 1; // Monday = 0
    if (startDay < 0) startDay = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = this.buildDateStr(y, m, d);
      days.push({
        date: d, month: m, year: y, isCurrentMonth: false,
        isToday: dateStr === todayStr, isSelected: dateStr === selected,
        isPast: new Date(y, m, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        dateStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = this.buildDateStr(year, month, d);
      days.push({
        date: d, month, year, isCurrentMonth: true,
        isToday: dateStr === todayStr, isSelected: dateStr === selected,
        isPast: new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        dateStr,
      });
    }

    // Next month days (fill to 42)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = this.buildDateStr(y, m, d);
      days.push({
        date: d, month: m, year: y, isCurrentMonth: false,
        isToday: dateStr === todayStr, isSelected: dateStr === selected,
        isPast: false, dateStr,
      });
    }

    return days;
  });

  private onChange = (_: string | null) => {};
  private onTouched = () => {};

  constructor(private el: ElementRef) {}

  toggle(trigger: HTMLElement) {
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.isMobile.set(window.innerWidth <= 768);
    if (this.isMobile()) {
      document.body.style.overflow = 'hidden';
    } else {
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipped = spaceBelow < 320;
      this.dropdownPos.set({
        top: flipped ? null : rect.bottom + 4,
        bottom: flipped ? (window.innerHeight - rect.top) + 4 : null,
        left: rect.left,
        flipped,
      });
    }
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.dropdownPos.set(null);
    document.body.style.overflow = '';
  }

  selectDay(day: CalendarDay) {
    if (day.isPast && this.disablePast) return;
    this.value.set(day.dateStr);
    this.onChange(day.dateStr);
    this.onTouched();
    this.close();
  }

  clear(e: Event) {
    e.stopPropagation();
    this.value.set(null);
    this.onChange(null);
    this.onTouched();
  }

  prevMonth() {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update(y => y - 1);
    } else {
      this.viewMonth.update(m => m - 1);
    }
  }

  nextMonth() {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update(y => y + 1);
    } else {
      this.viewMonth.update(m => m + 1);
    }
  }

  goToday() {
    const today = new Date();
    this.viewMonth.set(today.getMonth());
    this.viewYear.set(today.getFullYear());
    this.selectDay({
      date: today.getDate(), month: today.getMonth(), year: today.getFullYear(),
      isCurrentMonth: true, isToday: true, isSelected: true, isPast: false,
      dateStr: this.toDateStr(today),
    });
  }

  formatDisplay(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${d} ${MONTHS_ES[m - 1]?.substring(0, 3)} ${y}`;
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private buildDateStr(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.isMobile() && !this.el.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  // ── ControlValueAccessor ──────────────────────────────────────────────
  writeValue(val: string | null): void {
    this.value.set(val);
    if (val) {
      const [y, m] = val.split('-').map(Number);
      this.viewMonth.set(m - 1);
      this.viewYear.set(y);
    }
  }

  registerOnChange(fn: (_: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
}
