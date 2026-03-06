import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
    selector: 'app-branch-select',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './branch-select.component.html',
    styleUrl: './branch-select.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchSelectComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly branches = this.auth.branches;
    readonly loading = signal(false);
    readonly error = signal('');
    readonly selectedId = signal<string | null>(null);

    select(branchId: string): void {
        this.selectedId.set(branchId);
        this.loading.set(true);
        this.error.set('');

        this.auth.selectBranch(branchId).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: (err) => {
                this.loading.set(false);
                this.error.set(err.error?.message ?? 'Error al seleccionar la sucursal.');
            },
        });
    }

    goBack(): void {
        this.router.navigate(['/login']);
    }
}
