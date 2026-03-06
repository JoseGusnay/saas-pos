import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import {
    AuthUser,
    AuthState,
    BranchOption,
    LoginResponse,
    AUTH_TOKEN_KEY,
} from './auth.model';

interface JwtPayload {
    sub: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    tenantId: string;
    branchId?: string | null;
    permissions: string[];
    isGlobalAdmin: boolean;
    exp: number;
    iat: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly base = `${environment.apiUrl}/api/business/auth`;

    // ─── Signals ──────────────────────────────────────────────────────────────
    private readonly _state = signal<AuthState>({
        user: null,
        token: null,
        branches: [],
        isAuthenticated: false,
    });

    readonly currentUser = computed(() => this._state().user);
    readonly isAuthenticated = computed(() => this._state().isAuthenticated);
    readonly branches = computed(() => this._state().branches);
    readonly permissions = computed(() => this._state().user?.permissions ?? []);

    /** Silent refresh timer handle */
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;

    // ─── Session Restoration (called on app init) ─────────────────────────────
    restoreSession(): void {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        try {
            const payload = jwtDecode<JwtPayload>(token);
            const nowSeconds = Math.floor(Date.now() / 1000);

            if (payload.exp <= nowSeconds) {
                // Token expired → clean up and redirect
                this.clearSession();
                this.router.navigate(['/login']);
                return;
            }

            // Valid token — restore state
            this._state.set({
                token,
                user: this.payloadToUser(payload),
                branches: [],
                isAuthenticated: !!payload.branchId, // Full auth only if branch already selected
            });

            this.scheduleRefresh(payload.exp);
        } catch {
            this.clearSession();
            this.router.navigate(['/login']);
        }
    }

    // ─── Step 1: Login ────────────────────────────────────────────────────────
    login(email: string, password: string): Observable<LoginResponse> {
        return this.http
            .post<{ data: LoginResponse }>(`${this.base}/login`, { email, password })
            .pipe(
                tap((envelope) => {
                    const res = envelope.data;
                    // Store pre-token (no branchId yet)
                    this.storeToken(res.access_token);
                    this._state.update((s) => ({
                        ...s,
                        token: res.access_token,
                        branches: res.branches,
                        isAuthenticated: false, // Not fully authenticated until branch selected
                    }));
                }),
                // Map back to LoginResponse for the component to consume
                map((envelope) => envelope.data),
            );
    }

    // ─── Step 2: Select Branch ────────────────────────────────────────────────
    selectBranch(branchId: string): Observable<{ access_token: string }> {
        return this.http
            .post<{ data: { access_token: string } }>(`${this.base}/select-branch`, { branchId })
            .pipe(
                tap((envelope) => {
                    const res = envelope.data;
                    this.storeToken(res.access_token);
                    const payload = jwtDecode<JwtPayload>(res.access_token);
                    this._state.update((s) => ({
                        ...s,
                        token: res.access_token,
                        user: this.payloadToUser(payload),
                        isAuthenticated: true,
                    }));
                    this.scheduleRefresh(payload.exp);
                }),
                map((envelope) => envelope.data),
            );
    }

    // ─── Refresh (also called by interceptor on 401) ───────────────────────────
    refresh(): Observable<{ access_token: string }> {
        return this.http
            .post<{ access_token: string }>(`${this.base}/refresh`, {})
            .pipe(
                tap((res) => {
                    this.storeToken(res.access_token);
                    const payload = jwtDecode<JwtPayload>(res.access_token);
                    this._state.update((s) => ({
                        ...s,
                        token: res.access_token,
                        user: this.payloadToUser(payload),
                    }));
                    this.scheduleRefresh(payload.exp);
                }),
            );
    }

    // ─── Logout ───────────────────────────────────────────────────────────────
    logout(): void {
        this.clearSession();
        this.router.navigate(['/login']);
    }

    // ─── Permission check ─────────────────────────────────────────────────────
    hasPermission(permission: string): boolean {
        return this.permissions().includes(permission);
    }

    // ─── Token access (used by interceptor) ───────────────────────────────────
    getToken(): string | null {
        return this._state().token;
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Schedules a silent refresh 10 minutes before token expiry.
     * Clears any previous timer first to avoid stacking.
     */
    private scheduleRefresh(expSeconds: number): void {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);

        const nowMs = Date.now();
        const expMs = expSeconds * 1000;
        const bufferMs = 10 * 60 * 1000; // 10 minutes before expiry
        const delayMs = Math.max(expMs - nowMs - bufferMs, 0);

        this.refreshTimer = setTimeout(() => {
            this.refresh().subscribe({
                error: () => this.logout(), // If refresh fails → force logout
            });
        }, delayMs);
    }

    private storeToken(token: string): void {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    private clearSession(): void {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
        this._state.set({ user: null, token: null, branches: [], isAuthenticated: false });
    }

    private payloadToUser(payload: JwtPayload): AuthUser {
        return {
            id: payload.sub,
            email: payload.email,
            firstName: payload.firstName ?? null,
            lastName: payload.lastName ?? null,
            tenantId: payload.tenantId,
            branchId: payload.branchId ?? null,
            permissions: payload.permissions ?? [],
            isGlobalAdmin: payload.isGlobalAdmin ?? false,
        };
    }
}
