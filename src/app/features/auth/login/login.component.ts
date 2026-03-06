import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../../shared/ui/atoms/button/button.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule, ButtonComponent],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly email = signal('');
    readonly password = signal('');
    readonly loading = signal(false);
    readonly error = signal('');
    readonly showPassword = signal(false);

    onSubmit(): void {
        const e = this.email().trim();
        const p = this.password();

        if (!e || !p) {
            this.error.set('Por favor ingresa tu correo y contraseña.');
            return;
        }

        this.loading.set(true);
        this.error.set('');

        this.auth.login(e, p).subscribe({
            next: (res) => {
                this.loading.set(false);
                // If user has only 1 branch, auto-select
                if (res.branches.length === 1) {
                    this.auth.selectBranch(res.branches[0].id).subscribe({
                        next: () => this.router.navigate(['/dashboard']),
                        error: (err) => this.error.set(err.error?.message ?? 'Error al seleccionar la sucursal.'),
                    });
                } else {
                    this.router.navigate(['/select-branch']);
                }
            },
            error: (err) => {
                this.loading.set(false);
                this.error.set(err.error?.message ?? 'Credenciales incorrectas. Inténtalo de nuevo.');
            },
        });
    }
}
