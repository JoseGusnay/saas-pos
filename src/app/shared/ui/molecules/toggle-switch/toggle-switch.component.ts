import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    model,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ToggleSwitch — DS Molecule
 * Accessible toggle control using model() for two-way binding.
 * Used for isActive toggles in tables.
 */
@Component({
    selector: 'ui-toggle-switch',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <label class="toggle" [class.toggle--disabled]="disabled()">
            <input
                type="checkbox"
                class="toggle__input"
                [checked]="checked()"
                [disabled]="disabled()"
                (change)="onToggle($event)"
            />
            <span class="toggle__track">
                <span class="toggle__thumb"></span>
            </span>
            <span *ngIf="label()" class="toggle__label">{{ label() }}</span>
        </label>
    `,
    styleUrl: './toggle-switch.component.scss',
})
export class ToggleSwitchComponent {
    readonly checked = model<boolean>(false);
    readonly disabled = input<boolean>(false);
    readonly label = input<string>('');

    readonly toggled = output<boolean>();

    onToggle(event: Event): void {
        const value = (event.target as HTMLInputElement).checked;
        this.checked.set(value);
        this.toggled.emit(value);
    }
}
