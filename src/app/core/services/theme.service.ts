import { Injectable, signal, effect, inject, DOCUMENT } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT);
    private readonly storageKey = 'pos-theme';

    readonly theme = signal<Theme>(this.getInitialTheme());
    readonly isDark = signal<boolean>(this.theme() === 'dark');

    constructor() {
        // Apply theme to <html> element on every change
        effect(() => {
            const current = this.theme();
            this.document.documentElement.setAttribute('data-theme', current);
            this.isDark.set(current === 'dark');
            localStorage.setItem(this.storageKey, current);
        });
    }

    toggle(): void {
        this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
    }

    setTheme(theme: Theme): void {
        this.theme.set(theme);
    }

    private getInitialTheme(): Theme {
        const stored = localStorage.getItem(this.storageKey) as Theme | null;
        if (stored === 'light' || stored === 'dark') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
}
