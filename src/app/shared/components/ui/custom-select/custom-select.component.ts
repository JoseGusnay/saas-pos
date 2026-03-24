import { Component, Input, Output, EventEmitter, HostListener, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideCheck, lucideX } from '@ng-icons/lucide';

export interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ lucideChevronDown, lucideCheck, lucideX })
  ],
  template: `
    <div class="cs" [class.is-open]="isOpen" [class.cs--sm]="size === 'sm'">
      <button
        #trigger
        type="button"
        class="cs__trigger"
        (click)="toggle(trigger)"
      >
        <span class="cs__label" [class.cs__label--placeholder]="!value">{{ selectedLabel }}</span>
        <ng-icon name="lucideChevronDown" class="cs__chevron"></ng-icon>
      </button>

      <!-- Desktop: fixed dropdown -->
      @if (isOpen && !isMobile()) {
        <div class="cs__backdrop" (click)="close()"></div>
        <div class="cs__menu"
             [class.cs__menu--flipped]="dropdownPos()?.flipped"
             [style.top.px]="dropdownPos()?.top"
             [style.bottom.px]="dropdownPos()?.bottom"
             [style.left.px]="dropdownPos()?.left"
             [style.min-width.px]="dropdownPos()?.width">
          @for (option of options; track option.value) {
            <div
              class="cs__option"
              [class.is-active]="option.value === value"
              (click)="select(option)"
            >
              <span>{{ option.label }}</span>
              @if (option.value === value) {
                <ng-icon name="lucideCheck" class="cs__check"></ng-icon>
              }
            </div>
          }
        </div>
      }

      <!-- Mobile: bottom sheet -->
      @if (isOpen && isMobile()) {
        <div class="cs__sheet-backdrop" (click)="close()"></div>
        <div class="cs__sheet">
          <div class="cs__sheet-handle"></div>
          <div class="cs__sheet-header">
            <span class="cs__sheet-title">Seleccionar</span>
            <button type="button" class="cs__sheet-close" (click)="close()">
              <ng-icon name="lucideX"></ng-icon>
            </button>
          </div>
          <div class="cs__sheet-options">
            @for (option of options; track option.value) {
              <div
                class="cs__option cs__option--sheet"
                [class.is-active]="option.value === value"
                (click)="select(option)"
              >
                <span>{{ option.label }}</span>
                @if (option.value === value) {
                  <ng-icon name="lucideCheck" class="cs__check"></ng-icon>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cs {
      position: relative;
      width: 100%;

      &--sm .cs__trigger {
        height: 32px;
        padding: 0 10px;
        font-size: var(--font-size-sm);
        line-height: 1;
      }

      &__trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-base);
        color: var(--color-text-main);
        cursor: pointer;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background-color var(--transition-fast);
        gap: 8px;
        font-family: inherit;
        line-height: var(--line-height-normal);

        &:hover { border-color: var(--color-border-hover); }
        &:focus-visible {
          outline: none;
          border-color: var(--color-border-focus);
          background: var(--color-bg-input-focus);
          box-shadow: var(--shadow-input-focus);
        }
      }

      &__chevron {
        font-size: 14px;
        color: var(--color-text-muted);
        transition: transform var(--transition-fast);
        flex-shrink: 0;
      }

      &.is-open .cs__trigger {
        border-color: var(--color-border-focus);
        background: var(--color-bg-input-focus);
        box-shadow: var(--shadow-input-focus);
        .cs__chevron { transform: rotate(180deg); }
      }

      &__label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &--placeholder { color: var(--color-placeholder); }
      }

      /* ── Desktop backdrop (invisible, for click-outside) ──── */
      &__backdrop {
        position: fixed;
        inset: 0;
        z-index: var(--z-sheet);
      }

      /* ── Desktop dropdown (fixed) ─────────────────────────── */
      &__menu {
        position: fixed;
        z-index: calc(var(--z-sheet) + 1);
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-sm);
        padding: 4px;
        box-shadow: var(--shadow-dropdown);
        animation: csSlideDown 0.12s ease-out;
        display: flex;
        flex-direction: column;
        gap: 1px;
        max-height: 280px;
        overflow-y: auto;

        &--flipped { animation: csSlideUp 0.12s ease-out; }

        // Scrollbar
        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-track { background: transparent; }
        &::-webkit-scrollbar-thumb { background: var(--color-border-light); border-radius: 10px; }
        &::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
      }

      /* ── Option (shared desktop + sheet) ─────────────────── */
      &__option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 10px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: var(--font-size-sm);
        color: var(--color-text-soft);
        transition: background var(--transition-fast), color var(--transition-fast);

        &:hover { background: var(--color-bg-hover); color: var(--color-text-main); }

        &.is-active {
          background: var(--color-bg-active);
          color: var(--color-accent-interactive);
          font-weight: var(--font-weight-semibold);
        }

        &--sheet {
          padding: 14px 20px;
          border-radius: 0;
          font-size: var(--font-size-base);
          border-bottom: 1px solid var(--color-border-subtle);
          &:last-child { border-bottom: none; }

          &.is-active {
            background: var(--color-bg-active);
          }
        }
      }

      &__check { font-size: 14px; color: var(--color-accent-interactive); flex-shrink: 0; }

      /* ── Mobile backdrop ─────────────────────────────────── */
      &__sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: var(--z-sheet);
        animation: csFadeIn 0.2s ease;
      }

      /* ── Mobile bottom sheet ─────────────────────────────── */
      &__sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: calc(var(--z-sheet) + 1);
        background: var(--color-bg-surface);
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        animation: csSheetUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        padding-bottom: env(safe-area-inset-bottom, 0);
      }

      &__sheet-handle {
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: var(--color-border-light);
        margin: 8px auto 0;
      }

      &__sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 8px;
      }

      &__sheet-title {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-main);
      }

      &__sheet-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 50%;
        background: var(--color-bg-subtle);
        color: var(--color-text-muted);
        cursor: pointer;
        font-size: 14px;
        transition: background var(--transition-fast);
        &:hover { background: var(--color-border-light); color: var(--color-text-main); }
      }

      &__sheet-options {
        overflow-y: auto;
        padding: 4px 0 8px;
        -webkit-overflow-scrolling: touch;
      }
    }

    @keyframes csSlideDown {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes csSlideUp {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes csFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes csSheetUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `]
})
export class CustomSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() value: string = '';
  @Input() size: 'default' | 'sm' = 'default';
  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;
  isMobile = signal(false);
  dropdownPos = signal<{ top: number | null; bottom: number | null; left: number; width: number; flipped: boolean } | null>(null);

  constructor(private elementRef: ElementRef) {}

  get selectedLabel(): string {
    return this.options.find(o => o.value === this.value)?.label || 'Seleccionar...';
  }

  toggle(trigger: HTMLElement) {
    if (this.isOpen) {
      this.close();
      return;
    }
    this.isMobile.set(window.innerWidth <= 768);
    if (this.isMobile()) {
      document.body.style.overflow = 'hidden';
    } else {
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipped = spaceBelow < 300;
      this.dropdownPos.set({
        top: flipped ? null : rect.bottom + 4,
        bottom: flipped ? (window.innerHeight - rect.top) + 4 : null,
        left: rect.left,
        width: rect.width,
        flipped,
      });
    }
    this.isOpen = true;
  }

  select(option: SelectOption) {
    this.value = option.value;
    this.valueChange.emit(this.value);
    this.close();
  }

  close() {
    this.isOpen = false;
    this.dropdownPos.set(null);
    document.body.style.overflow = '';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.isMobile() && !this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
