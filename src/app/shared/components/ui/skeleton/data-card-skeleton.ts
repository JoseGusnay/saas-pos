import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SkeletonComponent } from './skeleton';

@Component({
  selector: 'app-data-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent],
  template: `
    <article class="skel-card">
      <header class="skel-card__header">
        <div class="skel-card__title">
          <app-skeleton width="55%" height="14px"></app-skeleton>
          <app-skeleton width="64px" height="18px" radius="999px"></app-skeleton>
        </div>
        <app-skeleton width="28px" height="28px" shape="circle"></app-skeleton>
      </header>

      <div class="skel-card__body">
        <div class="skel-card__row">
          <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
          <app-skeleton width="70%" height="12px"></app-skeleton>
        </div>
        <div class="skel-card__row">
          <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
          <app-skeleton width="50%" height="12px"></app-skeleton>
        </div>
        <div class="skel-card__row">
          <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
          <app-skeleton width="60%" height="12px"></app-skeleton>
        </div>
      </div>

      <footer class="skel-card__footer">
        <div class="skel-card__metric">
          <app-skeleton width="60px" height="10px"></app-skeleton>
          <app-skeleton width="44px" height="16px"></app-skeleton>
        </div>
      </footer>
    </article>
  `,
  styles: [`
    .skel-card {
      pointer-events: none;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      background: var(--color-bg-surface);
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 20px;
    }

    .skel-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .skel-card__title {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .skel-card__body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
      flex: 1;
    }

    .skel-card__row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .skel-card__footer {
      padding-top: 14px;
      border-top: 1px solid var(--color-border-light);
    }

    .skel-card__metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  `]
})
export class DataCardSkeletonComponent {}
