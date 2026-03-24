import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {

    // Signal central de la verdad para Vercel/Linear mode
    isSidebarCollapsed = signal<boolean>(true);

    // Estado del Drawer Móvil (< 768px)
    isMobileMenuOpen = signal<boolean>(false);

    // Detecta si estamos en viewport móvil
    isMobile = signal<boolean>(false);

    // En móvil el sidebar siempre se muestra expandido (drawer completo)
    isVisuallyCollapsed = computed(() => this.isSidebarCollapsed() && !this.isMobile());

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

            // Detectar viewport móvil
            const mobileQuery = window.matchMedia('(max-width: 768px)');
            this.isMobile.set(mobileQuery.matches);
            mobileQuery.addEventListener('change', (e) => {
                this.isMobile.set(e.matches);
                if (e.matches) {
                    this.closeMobileMenu();
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
