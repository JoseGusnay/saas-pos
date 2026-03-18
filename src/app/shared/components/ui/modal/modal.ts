import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger, state } from '@angular/animations';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './modal.html',
  styleUrls: ['./modal.scss'],
  providers: [provideIcons({ lucideX })],
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ transform: '{{initialTransform}}', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: '{{targetTransform}}', opacity: 1 }))
      ], { params: { initialTransform: 'scale(0.95)', targetTransform: 'translate(-50%, -50%)' } }),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: '{{initialTransform}}', opacity: 0 }))
      ], { params: { initialTransform: 'scale(0.95)' } })
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
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() allowClose = true;
  @Output() close = new EventEmitter<void>();

  get initialTransform(): string {
    // Mobile: viene de abajo (100%)
    // Desktop: escala desde el centro con su respectivo translate (-50%, -50%)
    return window.innerWidth <= 768 ? 'translateY(100%)' : 'translate(-50%, -50%) scale(0.95)';
  }

  get targetTransform(): string {
    // Mobile: posición normal (bottom: 0)
    // Desktop: centrado perfecto
    return window.innerWidth <= 768 ? 'none' : 'translate(-50%, -50%) scale(1)';
  }

  onClose() {
    if (this.allowClose) {
      this.close.emit();
    }
  }
}
