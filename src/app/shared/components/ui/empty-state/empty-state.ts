import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideInbox, lucideArrowRight } from '@ng-icons/lucide';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ lucideSearch, lucideInbox, lucideArrowRight })
  ],
  template: `
    <div class="empty-state" [class.empty-state--lg]="size === 'lg'">
      <div class="empty-state__visual">
        @if (image) {
          <img [src]="image" class="empty-state__image" alt="Empty state illustration">
        } @else {
          <div class="empty-state__icon-container">
            <ng-icon [name]="icon" class="empty-state__icon"></ng-icon>
            <div class="empty-state__icon-ring"></div>
            <div class="empty-state__icon-glow"></div>
          </div>
        }
      </div>
      
      <h3 class="empty-state__title">{{ title }}</h3>
      <p class="empty-state__description">{{ description }}</p>
      
      <div class="empty-state__actions" *ngIf="actionLabel">
        <button class="btn btn-primary" (click)="action.emit()">
          <span>{{ actionLabel }}</span>
          <ng-icon name="lucideArrowRight"></ng-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      border-radius: var(--radius-xl);
      background-color: var(--color-bg-surface);
      border: 1px dashed var(--color-border-light);
      animation: emptyStateFadeIn 0.5s ease-out;
      width: 100%;
      max-width: 600px;
      margin: 24px auto;

      &--lg {
        padding: 80px 40px;
      }

      &__visual {
        margin-bottom: 32px;
      }

      &__image {
        width: 100%;
        max-width: 240px;
        height: auto;
        filter: drop-shadow(0 10px 15px rgba(0,0,0,0.05));
      }

      &__icon-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        border-radius: 24px;
        background: linear-gradient(135deg, var(--color-bg-hover), var(--color-bg-surface));
        color: var(--color-primary);
        box-shadow: var(--shadow-md);
        transform: rotate(-3deg);
      }

      &__icon {
        font-size: 36px;
        z-index: 2;
      }

      &__icon-ring {
        position: absolute;
        inset: -12px;
        border-radius: 32px;
        border: 2px solid var(--color-primary-subtle);
        opacity: 0.2;
        animation: ringPulse 4s infinite ease-in-out;
      }

      &__icon-glow {
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: var(--color-primary);
        filter: blur(20px);
        opacity: 0.1;
        z-index: 1;
      }

      &__title {
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold);
        color: var(--color-text-main);
        margin-bottom: 12px;
        letter-spacing: -0.02em;
      }

      &__description {
        font-size: 1rem;
        color: var(--color-text-muted);
        max-width: 360px;
        line-height: 1.6;
        margin-bottom: 32px;
      }

      &__actions {
        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
        }
      }
    }

    @keyframes emptyStateFadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes ringPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.3;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.1;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon: string = 'lucideInbox';
  @Input() image?: string;
  @Input() title: string = 'No se encontraron resultados';
  @Input() description: string = 'Intenta ajustar tus filtros o buscar términos diferentes.';
  @Input() actionLabel?: string;
  @Input() size: 'md' | 'lg' = 'md';
  
  @Output() action = new EventEmitter<void>();
}
