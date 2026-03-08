import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/components/auth-ui/auth-card/auth-card.component';
import { AuthInputComponent } from '../../../../shared/components/auth-ui/auth-input/auth-input.component';
import { AuthButtonComponent } from '../../../../shared/components/auth-ui/auth-button/auth-button.component';
import { AuthBranding } from '../../../../shared/components/auth-ui/auth-branding/auth-branding';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-reset-password-page',
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
    templateUrl: './reset-password-page.component.html',
    styleUrls: ['./reset-password-page.component.scss']
})
export class ResetPasswordPageComponent implements OnInit {
    private fb = inject(FormBuilder);
    public authService = inject(AuthService);
    private router = inject(Router);

    emailToRecover: string = '';

    resetForm: FormGroup = this.fb.group({
        otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });

    ngOnInit(): void {
        const state = history.state;
        if (state && state.email) {
            this.emailToRecover = state.email;
        } else {
            // Si llegamos sin email (direct link), regresar a recuperar
            this.router.navigate(['/auth/recover-password']);
        }
    }

    get otpError(): string | null {
        const control = this.resetForm.get('otp');
        if (control?.touched && control?.errors) {
            if (control.errors['required']) return 'Ingresa el código.';
            if (control.errors['minlength']) return 'Debe tener 6 dígitos.';
        }
        return null;
    }

    get newPasswordError(): string | null {
        const control = this.resetForm.get('newPassword');
        if (control?.touched && control?.errors) {
            if (control.errors['required']) return 'La contraseña es requerida.';
            if (control.errors['minlength']) return 'Minimo 6 caracteres.';
        }
        return null;
    }

    onSubmit(): void {
        if (this.resetForm.invalid) {
            this.resetForm.markAllAsTouched();
            return;
        }

        const payload = {
            email: this.emailToRecover,
            otp: this.resetForm.value.otp,
            newPassword: this.resetForm.value.newPassword
        };

        this.authService.resetPassword(payload).subscribe({
            next: () => {
                // En Fase 4 añadiremos Toast de "Éxito". Por ahora redirigimos al login
                this.router.navigate(['/auth/login']);
            },
            error: () => { }
        });
    }
}
