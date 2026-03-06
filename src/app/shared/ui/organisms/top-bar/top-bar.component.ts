import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
    selector: 'app-top-bar',
    standalone: true,
    imports: [],
    templateUrl: './top-bar.component.html',
    styleUrl: './top-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
    readonly pageTitle = input<string>('Dashboard');
    readonly sidebarCollapsed = input<boolean>(false);
    readonly toggleSidebar = output<void>();

    protected readonly themeService = inject(ThemeService);
}
