import { Component, input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

@Component({
    selector: 'app-icon',
    standalone: true,
    imports: [NgIconComponent],
    template: `
    <ng-icon [name]="name()" class="icon"></ng-icon>
  `,
    styleUrl: './icon.component.scss'
})
export class IconComponent {
    // Recibe el nombre registrado en app.config.ts (ej. "layout-dashboard")
    name = input.required<string>();
}
