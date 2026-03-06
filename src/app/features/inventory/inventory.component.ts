import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-inventory',
    standalone: true,
    template: `<div style="padding: var(--space-4)"><h2 style="color: var(--color-text-primary); font-size: var(--text-2xl); font-weight: var(--font-bold)">Inventario</h2></div>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent { }
