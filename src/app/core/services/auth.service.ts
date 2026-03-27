import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    ApiResponse,
    BranchInfo,
    LoginCredentials,
    LoginStepOneResponse,
    AuthSuccessResponse,
    MessageResponse,
    UserProfile,
    TenantValidationResponse,
    AuthContextResponse,
} from '../models/auth.models';
import { ToastService } from './toast.service';

export interface AuthState {
    user: UserProfile | null;
    activeBranchId: string | null;
    availableBranches: BranchInfo[];
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private toast = inject(ToastService);

    // Asegúrate de que API_URL en enviroments/environment.ts sea tu backend.
    // Ejemplo: API_URL: 'http://localhost:3000/business/auth'
    private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/business/auth` : '/business/auth';

    // Estado reactivo (Signals)
    private state = signal<AuthState>({
        user: null,
        activeBranchId: null,
        availableBranches: [],
        isAuthenticated: false,
        isLoading: false,
        error: null,
    });

    // Nuevo: Señal para los datos del Tenant (anteriormente en TenantService)
    private tenantData = signal<TenantValidationResponse | null>(null);

    // Selectores Computados (Signals)
    readonly user = computed(() => this.state().user);
    readonly activeBranchId = computed(() => this.state().activeBranchId);
    readonly availableBranches = computed(() => this.state().availableBranches);
    readonly isAuthenticated = computed(() => this.state().isAuthenticated);
    readonly isLoading = computed(() => this.state().isLoading);
    readonly error = computed(() => this.state().error);
    readonly tenant = computed(() => this.tenantData());

    /**
     * Extrae el subdominio de la URL actual o usa el de desarrollo.
     */
    get currentSubdomain(): string {
        if (!environment.production) {
            return environment.devSubdomain || 'osotest';
        }

        const hostname = window.location.hostname;
        const parts = hostname.split('.');

        // Si es subdominio.dominio.com -> subdominio
        if (parts.length >= 3) {
            return parts[0];
        }

        return '';
    }

    /**
     * Paso 0: Obtiene el contexto inicial (Tenant + Sesión) en una sola llamada.
     * Optimiza el arranque de la aplicación al unificar validaciones.
     */
    getInitialContext(): Observable<AuthContextResponse> {
        this.setLoading(true);

        return this.http
            .get<ApiResponse<AuthContextResponse>>(`${this.baseUrl}/session-context`, {
                withCredentials: true,
            })
            .pipe(
                map((res) => res.data),
                tap((ctx) => {
                    // Actualizamos ambos estados de golpe
                    this.tenantData.set(ctx.tenant);
                    this.state.update((s) => ({
                        ...s,
                        user: ctx.user,
                        activeBranchId: ctx.branchId ?? s.activeBranchId,
                        isAuthenticated: ctx.isAuthenticated,
                        isLoading: false,
                        error: null,
                    }));
                }),
                catchError((err) => {
                    this.state.update((s) => ({
                        ...s,
                        isLoading: false,
                        isAuthenticated: false,
                        user: null
                    }));
                    return throwError(() => err);
                })
            );
    }

    /**
     * Paso 1: Valida credenciales y obtiene la lista de sucursales.
     * La Cookie pre-token se auto-asigna en el navegador (si withCredentials es true).
     */
    loginStep1(credentials: LoginCredentials): Observable<LoginStepOneResponse> {
        this.setLoading(true);
        return this.http
            .post<ApiResponse<LoginStepOneResponse>>(`${this.baseUrl}/login`, credentials, {
                withCredentials: true,
            })
            .pipe(
                map(res => res.data),
                tap((data) => {
                    this.state.update((s) => ({
                        ...s,
                        user: data.user,
                        availableBranches: data.branches,
                        isLoading: false,
                        error: null,
                    }));
                }),
                catchError((err) => this.handleError(err))
            );
    }

    /**
     * Paso 2: Selecciona la sucursal de trabajo definitiva y emite Cookie definitiva.
     */
    selectBranch(branchId: string): Observable<AuthSuccessResponse> {
        this.setLoading(true);
        return this.http
            .post<ApiResponse<AuthSuccessResponse>>(
                `${this.baseUrl}/select-branch`,
                { branchId },
                { withCredentials: true }
            )
            .pipe(
                map(res => res.data),
                tap(() => {
                    this.state.update((s) => ({
                        ...s,
                        activeBranchId: branchId,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    }));
                    this.router.navigate(['/dashboard']);
                }),
                catchError((err) => this.handleError(err))
            );
    }

    /**
     * Obtiene el perfil del usuario actual (usado para persistencia de sesión al recargar)
     */
    /**
     * Devuelve las sucursales asignadas al usuario (query fresco a DB, no cache).
     */
    getMyBranches(): Observable<{ id: string; name: string; isMain: boolean; address: string | null; city: string | null }[]> {
        return this.http
            .get<ApiResponse<{ id: string; name: string; isMain: boolean; address: string | null; city: string | null }[]>>(
                `${this.baseUrl}/my-branches`,
                { withCredentials: true },
            )
            .pipe(map(res => res.data));
    }

    getMe(): Observable<UserProfile> {
        return this.http
            .get<ApiResponse<UserProfile>>(`${this.baseUrl}/me`, {
                withCredentials: true,
            })
            .pipe(
                map(res => res.data),
                tap((user) => {
                    this.state.update((s) => ({
                        ...s,
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    }));
                }),
                catchError((err) => {
                    // Si falla el 'me', simplemente no estamos autenticados
                    this.state.update((s) => ({ ...s, isAuthenticated: false, user: null }));
                    return throwError(() => err);
                })
            );
    }

    /**
     * Genera OTP por WhatsApp.
     */
    recoverPassword(email: string): Observable<MessageResponse> {
        this.setLoading(true);
        return this.http
            .post<ApiResponse<MessageResponse>>(`${this.baseUrl}/recover-password`, { email })
            .pipe(
                map(res => res.data),
                tap((data) => {
                    this.setLoading(false);
                    this.toast.success(data.message);
                }),
                catchError((err) => this.handleError(err))
            );
    }

    /**
     * Valida OTP y cambia clave
     */
    resetPassword(payload: { email: string; otp: string; newPassword: string }): Observable<MessageResponse> {
        this.setLoading(true);
        return this.http
            .post<ApiResponse<MessageResponse>>(`${this.baseUrl}/reset-password`, payload)
            .pipe(
                map(res => res.data),
                tap((data) => {
                    this.setLoading(false);
                    this.toast.success(data.message);
                }),
                catchError((err) => this.handleError(err))
            );
    }

    /**
     * Helpers para el estado
     */
    private setLoading(isLoading: boolean) {
        this.state.update((s) => ({ ...s, isLoading, error: isLoading ? null : s.error }));
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Ocurrió un error inesperado.';

        if (error.error && error.error.message) {
            // El backend manda un mensaje { message: '...' }
            errorMessage = error.error.message;
        } else if (error.status === 401) {
            errorMessage = 'Credenciales inválidas.';
        }

        this.state.update((s) => ({ ...s, isLoading: false, error: errorMessage }));
        this.toast.error(errorMessage);
        return throwError(() => new Error(errorMessage));
    }

    clearError() {
        this.state.update((s) => ({ ...s, error: null }));
    }

    /**
     * Cierra la sesión del usuario.
     * Limpia la cookie del lado del servidor y resetea el estado local.
     */
    logout() {
        this.setLoading(true);
        this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true })
            .pipe(
                finalize(() => {
                    // Reseteamos el estado SIEMPRE, incluso si falla el HTTP (ej. ya expiró)
                    this.state.set({
                        user: null,
                        activeBranchId: null,
                        availableBranches: [],
                        isAuthenticated: false,
                        isLoading: false,
                        error: null,
                    });
                    this.setLoading(false);
                    this.router.navigate(['/auth/login']);
                    this.toast.info('Sesión cerrada correctamente.');
                })
            )
            .subscribe();
    }
}
