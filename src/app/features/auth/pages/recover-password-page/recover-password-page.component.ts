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
    selector: 'app-recover-password-page',
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
    templateUrl: './recover-password-page.component.html',
    styleUrls: ['./recover-password-page.component.scss']
})
export class RecoverPasswordPageComponent {
    private fb = inject(FormBuilder);
    public authService = inject(AuthService);
    private router = inject(Router);

    isSuccess = false;

    recoverForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    get emailError(): string | null {
        const control = this.recoverForm.get('email');
        if (control?.touched && control?.errors) {
            if (control.errors['required']) return 'El email es requerido.';
            if (control.errors['email']) return 'Formato inválido.';
        }
        return null;
    }

    onSubmit(): void {
        if (this.recoverForm.invalid) {
            this.recoverForm.markAllAsTouched();
            return;
        }

        const email = this.recoverForm.value.email;
        this.authService.recoverPassword(email).subscribe({
            next: () => {
                // Marcamos éxito pero pasamos rápidamente a la vista de Ingreso de Código enviando el Email en el History State
                this.router.navigate(['/auth/reset-password'], { state: { email } });
            },
            error: () => { }
        });
    }
}
