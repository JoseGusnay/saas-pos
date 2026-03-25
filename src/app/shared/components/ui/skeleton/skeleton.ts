import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton" 
      [class.skeleton--circle]="shape === 'circle'"
      [class.skeleton--pulse]="animation === 'pulse'"
      [class.skeleton--shimmer]="animation === 'shimmer'"
      [style.width]="width"
      [style.height]="height"
      [style.border-radius]="radius"
    ></div>
  `,
  styles: [`
    .skeleton {
      background: var(--color-bg-subtle);
      position: relative;
      overflow: hidden;
      border-radius: var(--radius-sm);

      &--circle {
        border-radius: 50%;
      }

      &--pulse {
        animation: skeleton-pulse 1.8s ease-in-out infinite;
      }

      &--shimmer {
        &::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--color-bg-surface) 50%,
            transparent 100%
          );
          animation: skeleton-shimmer 1.8s ease-in-out infinite;
        }
      }
    }

    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes skeleton-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `]
})
export class SkeletonComponent {
  @Input() width: string = '100%';
  @Input() height: string = '1rem';
  @Input() shape: 'rect' | 'circle' = 'rect';
  @Input() radius: string = '';
  @Input() animation: 'pulse' | 'shimmer' | 'none' = 'shimmer';
}
