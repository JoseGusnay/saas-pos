import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../../core/services/theme.service';
import { BOTTOM_NAV_ITEMS, MAIN_NAV_ITEMS, NavItem } from '../../../../core/navigation/nav-item.model';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
    readonly collapsed = input<boolean>(false);

    protected readonly themeService = inject(ThemeService);
    protected readonly mainNavItems: NavItem[] = MAIN_NAV_ITEMS;
    protected readonly bottomNavItems: NavItem[] = BOTTOM_NAV_ITEMS;

    // State to track expanded submenus
    protected readonly expandedMenus = signal<Record<string, boolean>>({});

    toggleMenu(id: string): void {
        this.expandedMenus.update(state => ({
            ...state,
            [id]: !state[id]
        }));
    }
}
