import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMessageSquarePlus,
  lucideUserPlus,
  lucideTrash2,
  lucidePause,
} from '@ng-icons/lucide';
import { PosCartService } from '../../services/pos-cart.service';

export type KeypadMode = 'QTY' | 'DISC' | 'PRICE' | null;

@Component({
  selector: 'app-numeric-keypad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ lucideMessageSquarePlus, lucideUserPlus, lucideTrash2, lucidePause }),
  ],
  styleUrls: ['./numeric-keypad.component.scss'],
  template: `
    <div class="keypad">
      <!-- Number grid -->
      <div class="keypad__grid">
        @for (key of numKeys; track key) {
          <button
            class="keypad__key"
            [class.keypad__key--zero]="key === '0'"
            (click)="onKey(key)"
          >
            {{ key }}
          </button>
        }
        <button class="keypad__key keypad__key--dot" (click)="onKey('.')">.</button>

        <!-- Mode keys -->
        <button
          class="keypad__key keypad__key--mode"
          [class.keypad__key--mode-active]="activeMode() === 'QTY'"
          (click)="setMode('QTY')"
        >
          CANT
        </button>
        <button
          class="keypad__key keypad__key--mode"
          [class.keypad__key--mode-active]="activeMode() === 'DISC'"
          (click)="setMode('DISC')"
        >
          DESC
        </button>
        <button
          class="keypad__key keypad__key--mode"
          [class.keypad__key--mode-active]="activeMode() === 'PRICE'"
          (click)="setMode('PRICE')"
        >
          PRECIO
        </button>

        <!-- Action keys -->
        <button class="keypad__key keypad__key--clear" (click)="onClear()">CLR</button>
        <button class="keypad__key keypad__key--enter" (click)="onEnter()">ENT</button>
      </div>

      <!-- Right panel: display + action buttons -->
      <div class="keypad__panel">
        <!-- Current input display -->
        <div class="keypad__display">
          <span class="keypad__display-label">
            {{ modeLabel() }}
          </span>
          <div class="keypad__display-value">
            {{ buffer() || '0' }}
          </div>
        </div>

        <!-- Quick action buttons -->
        <div class="keypad__actions">
          <button class="keypad__action" (click)="addNote.emit()">
            <ng-icon name="lucideMessageSquarePlus" size="16" />
            <span>Nota</span>
          </button>
          <button class="keypad__action" (click)="assignCustomer.emit()">
            <ng-icon name="lucideUserPlus" size="16" />
            <span>Cliente</span>
          </button>
        </div>

        <!-- Danger zone -->
        <div class="keypad__danger">
          <button class="keypad__danger-btn keypad__danger-btn--void" (click)="voidAll.emit()">
            Anular todo
          </button>
          <button class="keypad__danger-btn keypad__danger-btn--suspend" (click)="suspend.emit()">
            Suspender
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NumericKeypadComponent {
  private readonly cart = inject(PosCartService);

  @Output() addNote = new EventEmitter<void>();
  @Output() assignCustomer = new EventEmitter<void>();
  @Output() voidAll = new EventEmitter<void>();
  @Output() suspend = new EventEmitter<void>();
  @Output() applyValue = new EventEmitter<{ mode: KeypadMode; value: number }>();

  readonly buffer = signal('');
  readonly activeMode = signal<KeypadMode>(null);

  readonly numKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  readonly modeLabel = computed(() => {
    switch (this.activeMode()) {
      case 'QTY': return 'CANTIDAD';
      case 'DISC': return 'DESCUENTO %';
      case 'PRICE': return 'PRECIO MANUAL';
      default: return 'ENTRADA';
    }
  });

  onKey(key: string): void {
    const current = this.buffer();
    if (key === '.' && current.includes('.')) return;
    if (key === '.' && current === '') {
      this.buffer.set('0.');
      return;
    }
    this.buffer.set(current + key);
  }

  setMode(mode: KeypadMode): void {
    this.activeMode.set(this.activeMode() === mode ? null : mode);
    this.buffer.set('');
  }

  onClear(): void {
    this.buffer.set('');
  }

  onEnter(): void {
    const value = parseFloat(this.buffer());
    if (isNaN(value) || value < 0) return;

    const mode = this.activeMode();
    if (mode) {
      this.applyValue.emit({ mode, value });
    }

    this.buffer.set('');
  }
}
