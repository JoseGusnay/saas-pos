import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-auth-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './auth-button.component.html',
    styleUrls: ['./auth-button.component.scss']
})
export class AuthButtonComponent {
    @Input() text: string = 'Continuar';
    @Input() isLoading: boolean = false;
    @Input() isDisabled: boolean = false;
    @Input() type: 'button' | 'submit' = 'submit';
    @Input() variant: 'primary' | 'secondary' = 'primary';

    @Output() onClick = new EventEmitter<Event>();

    handleClick(event: Event): void {
        if (!this.isDisabled && !this.isLoading) {
            this.onClick.emit(event);
        } else {
            event.preventDefault(); // Evitar form submit si está loading
        }
    }
}
