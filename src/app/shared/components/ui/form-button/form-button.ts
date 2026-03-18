import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { SpinnerComponent } from '../spinner/spinner';
import { lucideSave, lucideCheck, lucideX, lucidePencil, lucideHistory } from '@ng-icons/lucide';

@Component({
  selector: 'app-form-button',
  standalone: true,
  imports: [CommonModule, NgIconComponent, SpinnerComponent],
  providers: [
    provideIcons({ lucideSave, lucideCheck, lucideX, lucidePencil, lucideHistory })
  ],
  template: `
    <button 
      [type]="type"
      [class]="'btn btn-' + variant"
      [disabled]="disabled || loading"
    >
      <span class="btn-content" [class.is-loading]="loading">
        <app-spinner *ngIf="loading" [size]="16"></app-spinner>
        <ng-icon *ngIf="icon && !loading" [name]="icon"></ng-icon>
        <span>{{ loading ? loadingLabel : label }}</span>
      </span>
    </button>
  `,
  styles: [`
    .btn {
       display: inline-flex;
       align-items: center;
       justify-content: center;
       gap: 0.5rem;
       padding: 0.625rem 1.25rem;
       border-radius: var(--radius-md);
       font-size: var(--font-size-sm);
       font-weight: 500;
       cursor: pointer;
       transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
       border: 1px solid transparent;
       line-height: 1;
       white-space: nowrap;
       user-select: none;
       min-width: 100px;
       height: 38px;
        font-family: inherit;
        width: 100%;
    }

    .btn-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      height: 100%;
      transition: opacity 0.2s ease;

      &.is-loading {
        opacity: 0.7;
      }
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
    }

    .btn-primary {
      background: var(--color-accent-primary);
      color: var(--color-bg-surface);
      border-color: var(--color-accent-primary);
      
      &:hover:not(:disabled) {
        background: var(--color-accent-hover, #000);
        border-color: var(--color-accent-hover, #000);
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }
    }

    .btn-secondary {
      background: var(--color-bg-surface);
      color: var(--color-text-main);
      border-color: var(--color-border-light);
      box-shadow: var(--shadow-sm);

      &:hover:not(:disabled) {
        background: var(--color-bg-hover);
        border-color: var(--color-border-subtle);
      }
    }

    .btn-ghost {
      background: transparent;
      color: var(--color-text-muted);
      min-width: auto;
      
      &:hover:not(:disabled) {
        background: var(--color-bg-hover);
        color: var(--color-text-main);
      }
    }

    .btn-danger {
      background: var(--color-danger-bg);
      color: var(--color-danger-text);
      border-color: var(--color-danger-bg);
      
      &:hover:not(:disabled) {
        background: var(--color-danger-text);
        color: #fff;
        border-color: var(--color-danger-text);
      }
    }

    ng-icon {
      font-size: 1.1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    
    app-spinner {
      margin-right: 2px;
    }
  `]
})
export class FormButtonComponent {
  @Input() label: string = 'Guardar';
  @Input() loadingLabel: string = 'Guardando...';
  @Input() icon?: string;
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;
  @Input() type: 'submit' | 'button' = 'submit';
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
}
