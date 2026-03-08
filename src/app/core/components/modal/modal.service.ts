import { Injectable, Type, signal } from '@angular/core';

export interface ModalAction {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    action: () => void;
}

export interface ModalData {
    title: string;
    component: Type<any> | null;  // Reference to the dynamic component we want to render inside
    inputs?: Record<string, any>; // Optional data to bind into the dynamic component
    footerHint?: string;          // Optional text to show on the left side of the footer
    footerActions?: ModalAction[]; // Dynamic Action Buttons rendered in the Modal Footer natively
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    isOpen = signal(false);
    isClosing = signal(false);
    modalConfig = signal<ModalData | null>(null);

    open(component: Type<any>, title: string, inputs?: Record<string, any>, footerHint?: string, footerActions?: ModalAction[]) {
        this.modalConfig.set({ component, title, inputs, footerHint, footerActions });
        this.isOpen.set(true);
        this.isClosing.set(false);
    }

    close() {
        if (!this.isOpen()) return;
        this.isClosing.set(true);
        setTimeout(() => {
            this.isOpen.set(false);
            this.isClosing.set(false);
            this.modalConfig.set(null);
        }, 200); // 200ms must match exactly the fadeOut CSS duration
    }
}
