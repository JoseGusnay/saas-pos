import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    signal,
    inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../../organisms/sidebar/sidebar.component';
import { TopBarComponent } from '../../organisms/top-bar/top-bar.component';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
    selector: 'app-shell',
    standalone: true,
    imports: [RouterOutlet, SidebarComponent, TopBarComponent],
    templateUrl: './app-shell.component.html',
    styleUrl: './app-shell.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    // On mobile: false = sidebar closed (overlay), true = open
    // On desktop: false = full width, true = icon-only
    readonly sidebarCollapsed = signal<boolean>(this.getInitialState());

    ngOnInit(): void {
        // Restore session from localStorage on every page load
        this.authService.restoreSession();

        // Close mobile overlay on route navigation
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(() => {
                if (this.isMobile()) {
                    this.sidebarCollapsed.set(true);
                }
            });
    }

    toggleSidebar(): void {
        this.sidebarCollapsed.update(v => !v);
    }

    /** On mobile (<768px), sidebar starts CLOSED (collapsed=true).
     *  On tablet (768–1023px), sidebar starts ICON-ONLY (collapsed=true).
     *  On desktop (>=1024px), sidebar starts FULL (collapsed=false). */
    private getInitialState(): boolean {
        return window.innerWidth < 1024;
    }

    private isMobile(): boolean {
        return window.innerWidth < 768;
    }
}
