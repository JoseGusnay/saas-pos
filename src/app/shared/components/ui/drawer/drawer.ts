import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger, state } from '@angular/animations';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './drawer.html',
  styleUrls: ['./drawer.scss'],
  providers: [provideIcons({ lucideX })],
  animations: [
    trigger('drawerAnimation', [
      transition(':enter', [
        style({ transform: '{{initialTransform}}', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'none', opacity: 1 }))
      ], { params: { initialTransform: 'translateX(100%)' } }),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: '{{initialTransform}}', opacity: 0 }))
      ], { params: { initialTransform: 'translateX(100%)' } })
    ]),
    trigger('backdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms ease', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class DrawerComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() allowClose = true;
  @Input() size: string = 'default';
  @Output() close = new EventEmitter<void>();


  get initialTransform(): string {
    return window.innerWidth <= 768 ? 'translateY(100%)' : 'translateX(100%)';
  }

  onClose() {
    if (this.allowClose) {
      this.close.emit();
    }
  }
}
