import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-workspace-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scene">
      <!-- Aurora background glow -->
      <div class="aurora" aria-hidden="true"></div>

      <!-- Centered card -->
      <div class="card" role="main">
        <!-- Geometric icon mark -->
        <div class="icon-mark" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <!-- Eyebrow -->
        <p class="eyebrow">Espacio de trabajo</p>

        <!-- Main heading -->
        <h1 class="heading">No encontrado</h1>

        <!-- Separator -->
        <div class="sep" aria-hidden="true"></div>

        <!-- Body -->
        <p class="body-text">
          Este subdominio no está asociado a ninguna empresa activa.
          Verifica la dirección o contacta a tu administrador.
        </p>

        <!-- Footer -->
        <footer class="footer">
          &copy; {{ year }} OsoDreamer SaaS POS
        </footer>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap');

    :host {
      display: block;
      width: 100vw;
      height: 100vh;
    }

    .scene {
      position: relative;
      width: 100%;
      height: 100%;
      background: #080a12;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', -apple-system, sans-serif;
      overflow: hidden;
    }

    /* ── Aurora glow ── */
    .aurora {
      position: absolute;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(
        ellipse at center,
        rgba(99, 75, 230, 0.18) 0%,
        rgba(99, 75, 230, 0.06) 40%,
        transparent 70%
      );
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: aurora-breathe 6s ease-in-out infinite;
    }

    /* ── Card ── */
    .card {
      position: relative;
      width: min(440px, calc(100vw - 3rem));
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      padding: 3rem 2.5rem 2.5rem;
      text-align: center;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.04) inset,
        0 40px 80px -20px rgba(0,0,0,0.7);

      /* Entrance animation */
      animation: card-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    /* ── Icon mark ── */
    .icon-mark {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(99, 75, 230, 0.12);
      border: 1px solid rgba(99, 75, 230, 0.2);
      color: rgba(139, 116, 255, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.75rem;
    }

    /* ── Eyebrow ── */
    .eyebrow {
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.25);
      margin: 0 0 0.65rem;
    }

    /* ── Heading ── */
    .heading {
      font-size: 2.1rem;
      font-weight: 300;
      letter-spacing: -0.03em;
      color: rgba(255, 255, 255, 0.92);
      margin: 0 0 2rem;
      line-height: 1.1;
    }

    /* ── Separator ── */
    .sep {
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
      margin-bottom: 1.75rem;
    }

    /* ── Body text ── */
    .body-text {
      font-size: 0.88rem;
      line-height: 1.7;
      color: rgba(255, 255, 255, 0.35);
      margin: 0 0 2.5rem;
    }

    /* ── Footer ── */
    .footer {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.15);
    }

    /* ── Keyframes ── */
    @keyframes card-enter {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes aurora-breathe {
      0%, 100% { opacity: 1;   transform: translate(-50%, -50%) scale(1); }
      50%       { opacity: 0.7; transform: translate(-50%, -50%) scale(1.15); }
    }
  `]
})
export class WorkspaceNotFoundComponent {
  year = new Date().getFullYear();
}
