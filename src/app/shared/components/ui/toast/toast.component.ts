import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle, lucideXCircle, lucideInfo } from '@ng-icons/lucide';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule, NgIconComponent],
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss'],
    viewProviders: [provideIcons({ lucideCheckCircle, lucideXCircle, lucideInfo })]
})
export class ToastComponent {
    public toastService = inject(ToastService);

    getIconName(type: string): string {
        switch (type) {
            case 'success': return 'lucideCheckCircle';
            case 'error': return 'lucideXCircle';
            default: return 'lucideInfo';
        }
    }
}
