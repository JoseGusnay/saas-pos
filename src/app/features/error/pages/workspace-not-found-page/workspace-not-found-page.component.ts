import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-workspace-not-found-page',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="error-page">
            <div class="grid-overlay"></div>
            
            <div class="content">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Antigravity</span>
                </div>

                <div class="status-code">404</div>
                
                <h1 class="title">Espacio de trabajo no encontrado</h1>
                <p class="description">
                    El subdominio <span class="highlight">"{{ subdomain }}"</span> no parece estar vinculado a ninguna cuenta activa. 
                    Por favor, verifica la URL o contacta con el administrador de tu organización.
                </p>

                <div class="actions">
                    <a href="https://misaas.com" class="btn-primary">Volver al inicio</a>
                    <button (click)="retry()" class="btn-secondary">Reintentar</button>
                </div>
            </div>

            <footer class="footer">
                <p>&copy; 2026 Antigravity POS. Todos los derechos reservados.</p>
            </footer>
        </div>
    `,
    styles: [`
        .error-page {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: var(--color-bg-surface);
            color: var(--color-text-main);
            position: relative;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
        }

        .grid-overlay {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(circle at 1px 1px, var(--color-border-light) 1px, transparent 0);
            background-size: 40px 40px;
            mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
            opacity: 0.4;
            pointer-events: none;
        }

        .content {
            z-index: 10;
            text-align: center;
            max-width: 600px;
            padding: 2rem;
            animation: fadeIn 0.8s ease-out;
        }

        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            margin-bottom: 3rem;
            font-weight: 700;
            font-size: 1.25rem;
            letter-spacing: -0.02em;

            .logo-icon {
                width: 24px;
                height: 24px;
                background: var(--color-text-main);
                clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
            }
        }

        .status-code {
            font-size: 8rem;
            font-weight: 800;
            line-height: 1;
            letter-spacing: -0.05em;
            background: linear-gradient(180deg, var(--color-text-main) 0%, var(--color-text-muted) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
            opacity: 0.8;
        }

        .title {
            font-size: 2.25rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 1.5rem;
        }

        .description {
            font-size: 1.125rem;
            color: var(--color-text-muted);
            line-height: 1.6;
            margin-bottom: 3rem;

            .highlight {
                color: var(--color-text-main);
                font-weight: 600;
                background: var(--color-bg-subtle);
                padding: 0.2rem 0.4rem;
                border-radius: 4px;
            }
        }

        .actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }

        .btn-primary {
            background: var(--color-text-main);
            color: var(--color-bg-surface);
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 500;
            text-decoration: none;
            transition: transform 0.2s, opacity 0.2s;

            &:hover {
                transform: translateY(-2px);
                opacity: 0.9;
            }
        }

        .btn-secondary {
            background: transparent;
            color: var(--color-text-main);
            border: 1px solid var(--color-border-light);
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;

            &:hover {
                background: var(--color-bg-subtle);
            }
        }

        .footer {
            position: absolute;
            bottom: 2rem;
            color: var(--color-text-muted);
            font-size: 0.875rem;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class WorkspaceNotFoundPageComponent {
    private authService = inject(AuthService);

    get subdomain(): string {
        return this.authService.currentSubdomain;
    }

    retry(): void {
        window.location.reload();
    }
}
