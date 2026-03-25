import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideInbox } from '@ng-icons/lucide';
import { FormButtonComponent } from '../form-button/form-button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormButtonComponent],
  providers: [
    provideIcons({ lucideSearch, lucideInbox })
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
      
      @if (actionLabel) {
        <div class="empty-state__actions">
          <app-form-button
            [label]="actionLabel!"
            icon="lucideArrowRight"
            iconPosition="right"
            type="button"
            [fullWidth]="false"
            (click)="action.emit()"
          />
        </div>
      }
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
        width: 72px;
        height: 72px;
        border-radius: 20px;
        background: var(--color-primary-subtle);
        color: var(--color-accent-primary);
      }

      &__icon {
        font-size: 32px;
        z-index: 2;
      }

      &__icon-ring {
        position: absolute;
        inset: -8px;
        border-radius: 26px;
        border: 1.5px solid var(--color-border-light);
        animation: ringPulse 4s infinite ease-in-out;
      }

      &__icon-glow {
        display: none;
      }

      &__title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-main);
        margin-bottom: 8px;
        letter-spacing: -0.01em;
      }

      &__description {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        max-width: 340px;
        line-height: 1.5;
        margin-bottom: 24px;
      }

      &__actions {
        display: flex;
        justify-content: center;
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
