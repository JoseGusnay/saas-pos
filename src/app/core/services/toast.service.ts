import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    undoFn?: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toastsSignal = signal<ToastMessage[]>([]);
    public toasts = this.toastsSignal.asReadonly();

    show(message: string, type: ToastType = 'info', durationMs: number = 4000) {
        const id = Math.random().toString(36).substring(2, 9);

        this.toastsSignal.update((currentToasts) => {
            return [...currentToasts, { id, message, type }];
        });

        setTimeout(() => {
            this.remove(id);
        }, durationMs);
    }

    showWithUndo(message: string, undoFn: () => void, durationMs: number = 5000) {
        const id = Math.random().toString(36).substring(2, 9);

        this.toastsSignal.update((currentToasts) => {
            return [...currentToasts, { id, message, type: 'success', undoFn }];
        });

        setTimeout(() => {
            this.remove(id);
        }, durationMs);
    }

    success(message: string, duration?: number) {
        this.show(message, 'success', duration);
    }

    error(message: string, duration?: number) {
        this.show(message, 'error', duration);
    }

    info(message: string, duration?: number) {
        this.show(message, 'info', duration);
    }

    triggerUndo(id: string) {
        const toast = this.toastsSignal().find(t => t.id === id);
        if (toast?.undoFn) {
            toast.undoFn();
            this.remove(id);
        }
    }

    remove(id: string) {
        this.toastsSignal.update((currentToasts) =>
            currentToasts.filter(t => t.id !== id)
        );
    }
}
