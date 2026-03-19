import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucidePlusCircle, 
  lucideRefreshCw, 
  lucideTrash, 
  lucideCloudDownload, 
  lucideHistory,
  lucideArrowRight 
} from '@ng-icons/lucide';

export interface DatelineChange {
  label: string;
  oldValue: string;
  newValue: string;
  field?: string;
}

export interface DatelineItem {
  id: string | number;
  date: Date | string;
  action: string;
  actionLabel: string;
  user: string;
  icon?: string;
  message?: string;
  changes?: DatelineChange[];
}

@Component({
  selector: 'app-dateline',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ 
      lucidePlusCircle, 
      lucideRefreshCw, 
      lucideTrash, 
      lucideCloudDownload, 
      lucideHistory,
      lucideArrowRight 
    })
  ],
  template: `
    <div class="dateline">
      @for (item of items; track item.id) {
        <div class="dateline-item" [style.--index]="$index">
          <div class="dateline-left">
            <span class="dateline-time">{{ item.date | date:'h:mm a' }}</span>
            <span class="dateline-day">{{ item.date | date:'MMM d' }}</span>
          </div>
          
          <div class="dateline-center">
            <div class="dateline-marker" [ngClass]="item.action.toLowerCase()">
              <ng-icon [name]="item.icon || getFallbackIcon(item.action)"></ng-icon>
              <div class="marker-pulse"></div>
            </div>
          </div>

          <div class="dateline-right">
            <div class="dateline-card" [ngClass]="item.action.toLowerCase()">
              <div class="card-header">
                <span class="action-label">{{ item.actionLabel }}</span>
                <span class="user-name">{{ item.user }}</span>
              </div>

              @if (item.changes && item.changes.length > 0) {
                <div class="card-body changes">
                  @for (change of item.changes; track change.label) {
                    <div class="change-entry">
                      <span class="field-label">{{ change.label }}</span>
                      <div class="change-values">
                        <span class="old-val">{{ change.oldValue || '—' }}</span>
                        <ng-icon name="lucideArrowRight" class="arrow"></ng-icon>
                        <span class="new-val">{{ change.newValue }}</span>
                      </div>
                    </div>
                  }
                </div>
              } @else if (item.message) {
                <div class="card-body message">
                  {{ item.message }}
                </div>
              }
            </div>
          </div>
        </div>
      } @empty {
         <div class="dateline-empty">
            No hay registros de actividad disponibles.
         </div>
      }
    </div>
  `,
  styles: [`
    .dateline {
        display: flex;
        flex-direction: column;
        padding: 24px 12px;
        position: relative;
        gap: 32px;

        &::before {
            content: "";
            position: absolute;
            left: 88px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(180deg, 
                transparent 0%, 
                var(--color-primary-subtle) 10%, 
                var(--color-primary-subtle) 90%, 
                transparent 100%
            );
            opacity: 0.3;
        }

        &-item {
            display: flex;
            align-items: flex-start;
            gap: 0;
            animation: slideInRight 0.5s ease-out forwards;
            animation-delay: calc(var(--index) * 0.1s);
            opacity: 0;
        }

        &-left {
            width: 70px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            padding-top: 10px;
            gap: 2px;

            .dateline-time {
                font-size: 11px;
                font-weight: var(--font-weight-semibold);
                color: var(--color-text-main);
                white-space: nowrap;
            }
            .dateline-day {
                font-size: 10px;
                color: var(--color-text-muted);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
        }

        &-center {
            width: 38px;
            display: flex;
            justify-content: center;
            position: relative;
            z-index: 2;
        }

        &-marker {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            background: var(--color-bg-surface);
            border: 2px solid var(--color-border-subtle);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-text-muted);
            box-shadow: var(--shadow-sm);
            position: relative;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s, border-color 0.3s;

            ng-icon { font-size: 18px; }

            .marker-pulse {
                position: absolute;
                inset: -4px;
                border-radius: 16px;
                background: currentColor;
                opacity: 0;
                z-index: -1;
                transition: opacity 0.3s;
            }

            &:hover {
                transform: scale(1.1) rotate(5deg);
                .marker-pulse {
                    opacity: 0.15;
                    animation: markerPulse 2s infinite;
                }
            }

            &.create { color: #10b981; border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.05); }
            &.update { color: #3b82f6; border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05); }
            &.delete { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); }
            &.import { color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05); }
        }

        &-right {
            flex: 1;
            padding-left: 20px;
        }

        &-card {
            background: var(--color-bg-surface);
            border: 1px solid var(--color-border-subtle);
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

            &:hover {
                box-shadow: 0 8px 24px rgba(0,0,0,0.06);
                border-color: var(--color-border-light);
                transform: translateY(-2px);
            }

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                gap: 8px;

                .action-label {
                    font-size: 12px;
                    font-weight: var(--font-weight-bold);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .user-name {
                    font-size: 11px;
                    color: var(--color-text-muted);
                    background: var(--color-bg-hover);
                    padding: 2px 8px;
                    border-radius: 6px;
                }
            }

            &.create .action-label { color: #10b981; }
            &.update .action-label { color: #3b82f6; }
            &.delete .action-label { color: #ef4444; }
            &.import .action-label { color: #f59e0b; }

            .card-body {
                &.message {
                    font-size: 13px;
                    color: var(--color-text-soft);
                    line-height: 1.5;
                }

                &.changes {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
            }

            .change-entry {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 8px;
                background: var(--color-bg-hover);
                border-radius: 10px;
                border: 1px solid var(--color-border-light);

                .field-label {
                    font-size: 10px;
                    font-weight: var(--font-weight-bold);
                    color: var(--color-text-muted);
                    text-transform: uppercase;
                }

                .change-values {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;

                    .old-val {
                        color: var(--color-text-soft);
                        text-decoration: line-through;
                        opacity: 0.6;
                    }
                    .arrow {
                        font-size: 10px;
                        color: var(--color-text-muted);
                    }
                    .new-val {
                        color: var(--color-text-main);
                        font-weight: var(--font-weight-semibold);
                    }
                }
            }
        }

        &-empty {
           text-align: center;
           padding: 48px 0;
           color: var(--color-text-muted);
           font-style: italic;
        }
    }

    @keyframes markerPulse {
        0% { transform: scale(1); opacity: 0.4; }
        100% { transform: scale(1.6); opacity: 0; }
    }

    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
  `]
})
export class DatelineComponent {
  @Input() items: DatelineItem[] = [];

  getFallbackIcon(action: string): string {
    switch (action.toUpperCase()) {
      case 'CREATE': return 'lucidePlusCircle';
      case 'UPDATE': return 'lucideRefreshCw';
      case 'DELETE': return 'lucideTrash';
      case 'IMPORT': return 'lucideCloudDownload';
      default: return 'lucideHistory';
    }
  }
}
