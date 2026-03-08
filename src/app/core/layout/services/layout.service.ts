import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {

    // Signal central de la verdad para Vercel/Linear mode
    isSidebarCollapsed = signal<boolean>(false);

    // Estado del Drawer Móvil (< 768px)
    isMobileMenuOpen = signal<boolean>(false);

    // State para el Premium Dark Mode
    theme = signal<ThemeMode>('system');

    constructor() {
        // Inicialización CSR (Client Side Rendering) segura
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const storedTheme = localStorage.getItem('saas-theme') as ThemeMode;
            if (storedTheme) {
                this.theme.set(storedTheme);
            }

            // Effect para reconciliar la UI (DOM) cada que el signal Theme cambia
            effect(() => {
                const currentTheme = this.theme();
                let effectiveTheme: 'light' | 'dark' = 'light';

                if (currentTheme === 'system') {
                    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } else {
                    effectiveTheme = currentTheme;
                }

                document.documentElement.setAttribute('data-theme', effectiveTheme);
                localStorage.setItem('saas-theme', currentTheme);
            });

            // Reconciliación Responsiva Activa (Evita usar !important en SCSS)
            const tabletQuery = window.matchMedia('(min-width: 769px) and (max-width: 1024px)');
            if (tabletQuery.matches) {
                this.isSidebarCollapsed.set(true); // Auto-Colapso inicial en Tablet
            }

            tabletQuery.addEventListener('change', (e) => {
                if (e.matches) {
                    this.isSidebarCollapsed.set(true); // Entra a Tablet -> Colapsar
                } else if (window.innerWidth > 1024) {
                    this.isSidebarCollapsed.set(false); // Sube a Desktop -> Expandir
                }
            });
        }
    }

    toggleSidebar() {
        this.isSidebarCollapsed.update(state => !state);
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen.update(state => !state);
    }

    closeMobileMenu() {
        this.isMobileMenuOpen.set(false);
    }

    toggleTheme() {
        // Rotación simple light -> dark -> light (El system formará parte del primer fetch o puede activarse luego)
        this.theme.update(current => current === 'dark' ? 'light' : 'dark');
    }

}
