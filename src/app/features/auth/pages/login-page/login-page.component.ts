import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/components/auth-ui/auth-card/auth-card.component';
import { AuthInputComponent } from '../../../../shared/components/auth-ui/auth-input/auth-input.component';
import { AuthButtonComponent } from '../../../../shared/components/auth-ui/auth-button/auth-button.component';
import { AuthBranding } from '../../../../shared/components/auth-ui/auth-branding/auth-branding';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        AuthCardComponent,
        AuthInputComponent,
        AuthButtonComponent,
        AuthBranding
    ],
    templateUrl: './login-page.component.html',
    styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
    private fb = inject(FormBuilder);
    public authService = inject(AuthService);
    private router = inject(Router);

    loginForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    get emailError(): string | null {
        const control = this.loginForm.get('email');
        if (control?.touched && control?.errors) {
            if (control.errors['required']) return 'El email es requerido.';
            if (control.errors['email']) return 'Formato de email inválido.';
        }
        return null;
    }

    get passwordError(): string | null {
        const control = this.loginForm.get('password');
        if (control?.touched && control?.errors) {
            if (control.errors['required']) return 'La contraseña es requerida.';
            if (control.errors['minlength']) return 'Minimo 6 caracteres.';
        }
        return null;
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.authService.loginStep1(this.loginForm.value).subscribe({
            next: (data) => {
                // Si solo hay una sucursal, seleccionarla automáticamente
                if (data.branches && data.branches.length === 1) {
                    this.authService.selectBranch(data.branches[0].id).subscribe();
                } else {
                    // Redirige al paso 2 (selección manual)
                    this.router.navigate(['/auth/select-branch']);
                }
            },
            error: () => {
                // Error se maneja en el signal del servicio, UI reaccionará
            }
        });
    }
}
