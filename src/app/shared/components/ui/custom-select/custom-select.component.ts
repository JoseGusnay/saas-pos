import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideCheck } from '@ng-icons/lucide';

export interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ lucideChevronDown, lucideCheck })
  ],
  template: `
    <div class="custom-select" [class.is-open]="isOpen">
      <button 
        type="button" 
        class="custom-select__trigger" 
        (click)="toggle()"
      >
        <span class="selected-label">{{ selectedLabel }}</span>
        <ng-icon name="lucideChevronDown" class="chevron-icon"></ng-icon>
      </button>

      @if (isOpen) {
        <div class="custom-select__menu">
          @for (option of options; track option.value) {
            <div 
              class="custom-select__option" 
              [class.is-active]="option.value === value"
              (click)="select(option)"
            >
              <span class="option-label">{{ option.label }}</span>
              @if (option.value === value) {
                <ng-icon name="lucideCheck" class="check-icon"></ng-icon>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .custom-select {
      position: relative;
      width: fit-content;
      min-width: 180px;
      width: 100%;

      &__trigger {
        width: 100%;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-subtle);
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-main);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        gap: 8px;

        &:hover {
          border-color: var(--color-text-muted);
          background: var(--color-bg-hover);
        }

        .chevron-icon {
          font-size: 14px;
          color: var(--color-text-muted);
          transition: transform 0.2s ease;
        }
      }

      &.is-open {
        .custom-select__trigger {
          border-color: var(--color-text-main);
          box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
          
          .chevron-icon {
            transform: rotate(180deg);
          }
        }
      }

      &__menu {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        z-index: 50;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-subtle);
        border-radius: 10px;
        padding: 6px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        backdrop-filter: blur(8px);
        overflow: hidden;
        animation: slideIn 0.2s ease-out;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      &__option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        color: var(--color-text-soft);
        transition: all 0.15s ease;

        &:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-main);
        }

        &.is-active {
          background: var(--color-bg-hover);
          color: var(--color-text-main);
          font-weight: 600;
        }

        .check-icon {
          font-size: 14px;
          color: var(--color-primary);
        }
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class CustomSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;

  constructor(private elementRef: ElementRef) { }

  get selectedLabel(): string {
    return this.options.find(o => o.value === this.value)?.label || 'Seleccionar...';
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  select(option: SelectOption) {
    this.value = option.value;
    this.valueChange.emit(this.value);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
