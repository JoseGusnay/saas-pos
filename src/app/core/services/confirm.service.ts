import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  isOpen = signal(false);
  isClosing = signal(false);
  options = signal<ConfirmOptions | null>(null);

  private resolveFn: ((value: boolean) => void) | null = null;

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.options.set(options);
    this.isOpen.set(true);
    this.isClosing.set(false);
    return new Promise<boolean>(resolve => {
      this.resolveFn = resolve;
    });
  }

  accept() {
    this.closeWith(true);
  }

  cancel() {
    this.closeWith(false);
  }

  private closeWith(result: boolean) {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.isClosing.set(false);
      this.options.set(null);
      this.resolveFn?.(result);
      this.resolveFn = null;
    }, 200);
  }
}
