import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    template: `
    <div class="dashboard">
      <h2 class="dashboard__title">Bienvenido al Dashboard</h2>
      <p class="dashboard__subtitle">El diseño system está listo. ¡Aquí construiremos el POS!</p>
    </div>
  `,
    styles: [`
    .dashboard {
      padding: var(--space-4);
    }
    .dashboard__title {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--color-text-primary);
      margin-bottom: var(--space-2);
    }
    .dashboard__subtitle {
      font-size: var(--text-base);
      color: var(--color-text-secondary);
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent { }
