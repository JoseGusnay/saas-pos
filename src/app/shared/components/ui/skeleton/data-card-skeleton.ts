import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton';

@Component({
  selector: 'app-data-card-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <article class="data-card skeleton-card">
      <header class="data-card__header">
        <div class="data-card__title-container">
          <app-skeleton width="120px" height="1.1rem"></app-skeleton>
          <div style="margin-top: 4px">
            <app-skeleton width="60px" height="18px" radius="999px"></app-skeleton>
          </div>
        </div>
        <div class="data-card__kebab">
          <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
        </div>
      </header>

      <div class="data-card__body">
        <div class="data-card__detail">
          <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
          <app-skeleton width="180px" height="0.875rem"></app-skeleton>
        </div>
        <div class="data-card__detail">
          <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
          <app-skeleton width="120px" height="0.875rem"></app-skeleton>
        </div>
        <div class="data-card__detail">
          <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
          <app-skeleton width="150px" height="0.875rem"></app-skeleton>
        </div>
      </div>

      <footer class="data-card__footer">
        <div class="data-card__metric">
          <app-skeleton width="70px" height="11px" style="margin-bottom: 4px"></app-skeleton>
          <app-skeleton width="50px" height="1.25rem"></app-skeleton>
        </div>
        
        <div class="data-card__avatars">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-avatar" style="margin-left: -8px"></div>
        </div>
      </footer>
    </article>
  `,
  styles: [`
    .skeleton-card {
      pointer-events: none;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      background: var(--color-bg-surface);
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
      
      /* Padding base que coincide con DataCard */
      padding: 20px;

      .data-card__header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
      }
//...

      .data-card__title-container {
        display: flex;
        flex-direction: column;
      }

      .data-card__body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;
        flex: 1;
      }

      .data-card__detail {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .data-card__footer {
        padding-top: 16px;
        border-top: 1px solid var(--color-border-light);
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }

      .data-card__metric {
        display: flex;
        flex-direction: column;
      }

      .skeleton-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-bg-hover);
        border: 2px solid var(--color-bg-surface);
      }
    }
  `]
})
export class DataCardSkeletonComponent { }
