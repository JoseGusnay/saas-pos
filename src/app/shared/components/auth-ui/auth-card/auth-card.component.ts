import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-auth-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './auth-card.component.html',
    styleUrls: ['./auth-card.component.scss']
})
export class AuthCardComponent {
    @Input() title: string = '';
    @Input() subtitle: string = '';
}
