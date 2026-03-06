import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-workspace-not-found',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <main class="error-container">
      <div class="card">
        <div class="icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1>Espacio de Trabajo No Encontrado</h1>
        <p>No pudimos encontrar ninguna empresa asociada a este subdominio o se encuentra actualmente inactiva. Verifica la dirección URL o ponte en contacto con tu administrador del sistema.</p>
        
        <div class="footer">
          <span>&copy; {{ currentYear }} OsoDreamer SaaS POS</span>
        </div>
      </div>
    </main>
  `,
    styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
      background: #0f111a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Inter", sans-serif;
    }
    .error-container {
      width: 100%;
      max-width: 480px;
      padding: 2rem;
    }
    .card {
      background: #1e2130;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 3rem 2.5rem;
      text-align: center;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
    }
    .icon-wrapper {
      width: 80px;
      height: 80px;
      background: rgba(255, 65, 248, 0.1);
      color: #FF41F8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    h1 {
      color: #ffffff;
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 1.5rem;
      color: #64748b;
      font-size: 0.85rem;
    }
  `]
})
export class WorkspaceNotFoundComponent {
    currentYear = new Date().getFullYear();
}
