import {
  Component, ChangeDetectionStrategy, input, output, signal,
  ElementRef, viewChild, AfterViewInit, DestroyRef, inject
} from '@angular/core';

export interface TabItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="tab-bar"
      [class.tab-bar--can-scroll-left]="canScrollLeft()"
      [class.tab-bar--can-scroll-right]="canScrollRight()"
    >
      <div class="tab-bar__track" #track (scroll)="onScroll()">
        @for (tab of tabs(); track tab.value) {
          <button
            class="tab-bar__tab"
            [class.tab-bar__tab--active]="activeTab() === tab.value"
            (click)="tabChange.emit(tab.value)"
          >
            {{ tab.label }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .tab-bar {
      position: relative;

      &::before,
      &::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        width: 32px;
        pointer-events: none;
        z-index: 1;
        opacity: 0;
        transition: opacity var(--transition-fast);
      }

      &::before {
        left: 0;
        background: linear-gradient(to right, var(--color-bg-canvas), transparent);
      }

      &::after {
        right: 0;
        background: linear-gradient(to left, var(--color-bg-canvas), transparent);
      }

      &--can-scroll-left::before { opacity: 1; }
      &--can-scroll-right::after { opacity: 1; }
    }

    .tab-bar__track {
      display: flex;
      gap: 24px;
      overflow-x: auto;
      border-bottom: 1px solid var(--color-border-light);
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar { display: none; }

      @media (max-width: 768px) {
        gap: 4px;
      }
    }

    .tab-bar__tab {
      background: transparent;
      border: none;
      padding: 0 0 12px 0;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
      cursor: pointer;
      position: relative;
      transition: color var(--transition-fast);
      white-space: nowrap;
      flex-shrink: 0;

      @media (max-width: 768px) {
        padding: 0 8px 10px;
        font-size: var(--font-size-xs);
      }

      &:hover {
        color: var(--color-text-main);
      }

      &--active {
        color: var(--color-text-main);

        &::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--color-text-main);
          border-radius: 2px 2px 0 0;
        }
      }
    }
  `]
})
export class TabBarComponent implements AfterViewInit {
  private destroyRef = inject(DestroyRef);

  tabs      = input.required<TabItem[]>();
  activeTab = input('');
  tabChange = output<string>();

  track = viewChild.required<ElementRef<HTMLElement>>('track');

  canScrollLeft  = signal(false);
  canScrollRight = signal(false);

  ngAfterViewInit() {
    this.checkOverflow();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.checkOverflow());
      ro.observe(this.track().nativeElement);
      this.destroyRef.onDestroy(() => ro.disconnect());
    }
  }

  onScroll() {
    this.checkOverflow();
  }

  private checkOverflow() {
    const el = this.track().nativeElement;
    this.canScrollLeft.set(el.scrollLeft > 2);
    this.canScrollRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }
}
