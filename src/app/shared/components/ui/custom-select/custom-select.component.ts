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
    <div class="cs" [class.is-open]="isOpen">
      <button
        type="button"
        class="cs__trigger"
        (click)="toggle()"
      >
        <span class="cs__label">{{ selectedLabel }}</span>
        <ng-icon name="lucideChevronDown" class="cs__chevron"></ng-icon>
      </button>

      <!-- Desktop: dropdown -->
      @if (isOpen && !isMobile()) {
        <div class="cs__menu">
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
        <div class="cs__backdrop" (click)="close()" [@backdropAnim]></div>
        <div class="cs__sheet" [@sheetAnim]>
          <div class="cs__sheet-header">
            <span class="cs__sheet-title">Seleccionar</span>
            <button type="button" class="cs__sheet-close" (click)="close()">
              <ng-icon name="lucideX"></ng-icon>
            </button>
          </div>
          <div class="cs__sheet-handle"></div>
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

      &__trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        background: var(--color-bg-surface);
        border: 1.5px solid var(--color-border-light);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--color-text-main);
        cursor: pointer;
        transition: border-color var(--transition-fast);
        gap: 8px;
        font-family: inherit;

        &:hover { border-color: var(--color-border-medium, var(--color-text-muted)); }
      }

      &__chevron {
        font-size: 14px;
        color: var(--color-text-muted);
        transition: transform 0.2s ease;
      }

      &.is-open .cs__trigger {
        border-color: var(--color-accent-primary);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
        .cs__chevron { transform: rotate(180deg); }
      }

      &__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* ── Desktop dropdown ────────────────────────────────── */
      &__menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        z-index: 50;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-subtle);
        border-radius: 10px;
        padding: 6px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
        overflow: hidden;
        animation: csSlideDown 0.15s ease-out;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      /* ── Option (shared desktop + sheet) ─────────────────── */
      &__option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        color: var(--color-text-soft, var(--color-text-muted));
        transition: all 0.12s ease;

        &:hover { background: var(--color-bg-hover); color: var(--color-text-main); }
        &.is-active { background: var(--color-bg-hover); color: var(--color-text-main); font-weight: 600; }

        &--sheet {
          padding: 14px 20px;
          border-radius: 0;
          font-size: var(--font-size-base);
          border-bottom: 1px solid var(--color-border-subtle);
          &:last-child { border-bottom: none; }
        }
      }

      &__check { font-size: 14px; color: var(--color-accent-primary); }

      /* ── Mobile backdrop ─────────────────────────────────── */
      &__backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 9998;
        animation: csFadeIn 0.2s ease;
      }

      /* ── Mobile bottom sheet ─────────────────────────────── */
      &__sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: var(--color-bg-surface);
        border-radius: 16px 16px 0 0;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        animation: csSheetUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-main);
      }

      &__sheet-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 50%;
        background: var(--color-bg-hover);
        color: var(--color-text-muted);
        cursor: pointer;
        font-size: 14px;
        &:hover { background: var(--color-border-light); }
      }

      &__sheet-options {
        overflow-y: auto;
        padding: 8px 0;
        -webkit-overflow-scrolling: touch;
      }
    }

    @keyframes csSlideDown {
      from { opacity: 0; transform: translateY(-4px); }
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
  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;
  isMobile = signal(typeof window !== 'undefined' && window.innerWidth <= 768);

  constructor(private elementRef: ElementRef) {}

  get selectedLabel(): string {
    return this.options.find(o => o.value === this.value)?.label || 'Seleccionar...';
  }

  toggle() {
    this.isMobile.set(window.innerWidth <= 768);
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.isMobile()) {
      document.body.style.overflow = 'hidden';
    }
  }

  select(option: SelectOption) {
    this.value = option.value;
    this.valueChange.emit(this.value);
    this.close();
  }

  close() {
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.isMobile() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth <= 768);
  }
}
