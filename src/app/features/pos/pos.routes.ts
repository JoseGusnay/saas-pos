import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/pos-terminal/pos-terminal.component').then(
        (m) => m.PosTerminalComponent
      ),
  },
];
