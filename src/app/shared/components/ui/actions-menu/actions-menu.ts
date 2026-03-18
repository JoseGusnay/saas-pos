import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMoreVertical, lucidePencil, lucideTrash2 } from '@ng-icons/lucide';

export interface ActionItem {
  id: string;
  label: string;
  icon?: string;
  variant?: 'danger' | 'default';
}

@Component({
  selector: 'app-actions-menu',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  host: {
    '[class.actions-menu-open]': 'isOpen'
  },
  providers: [

    provideIcons({ lucideMoreVertical, lucidePencil, lucideTrash2 })
  ],
  template: `
    <div class="actions-menu">
      <button 
        type="button"
        class="btn btn-ghost btn-sm actions-menu__trigger" 
        (click)="toggleMenu($event)"
        [class.is-active]="isOpen">
        <ng-icon name="lucideMoreVertical"></ng-icon>
      </button>

      <div class="actions-menu__dropdown" *ngIf="isOpen" (click)="$event.stopPropagation()">
        <ul class="actions-menu__list">
          @for (action of actions; track action.id) {
            <li class="actions-menu__item">
              <button 
                type="button"
                class="actions-menu__btn" 
                [class.actions-menu__btn--danger]="action.variant === 'danger'"
                (click)="onActionClick(action)">
                <ng-icon *ngIf="action.icon" [name]="action.icon"></ng-icon>
                <span>{{ action.label }}</span>
              </button>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .actions-menu {
      position: relative;
      display: inline-block;

      &__trigger {
        width: 32px;
        height: 32px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        color: var(--color-text-muted);
        transition: all var(--transition-fast);

        &:hover, &.is-active {
          background-color: var(--color-bg-hover);
          color: var(--color-text-main);
        }
      }

      &__dropdown {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        min-width: 160px;
        background-color: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        overflow: hidden;
        animation: menuFadeIn 0.2s ease-out;
      }


      &__list {
        list-style: none;
        padding: 4px;
        margin: 0;
      }

      &__btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border: none;
        background: transparent;
        color: var(--color-text-main);
        font-size: 0.875rem;
        font-family: inherit;
        text-align: left;
        cursor: pointer;
        border-radius: var(--radius-sm);
        transition: background-color var(--transition-fast);

        &:hover {
          background-color: var(--color-bg-hover);
        }

        &--danger {
          color: var(--color-error);
          &:hover {
            background-color: rgba(var(--color-error-rgb), 0.1);
          }
        }

        ng-icon {
          font-size: 16px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }
      }

    }

    @keyframes menuFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class ActionsMenuComponent {
  private elementRef = inject(ElementRef);

  @Input() actions: ActionItem[] = [];
  @Output() actionClick = new EventEmitter<ActionItem>();

  isOpen = false;

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  onActionClick(action: ActionItem) {
    this.actionClick.emit(action);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
