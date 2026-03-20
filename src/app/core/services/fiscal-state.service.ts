import { Injectable, inject, signal, computed } from '@angular/core';
import { FiscalService } from './fiscal.service';
import { EmpresaFiscal } from '../models/fiscal.models';

@Injectable({ providedIn: 'root' })
export class FiscalStateService {
  private fiscalService = inject(FiscalService);

  private _empresa = signal<EmpresaFiscal | null>(null);
  readonly empresa = this._empresa.asReadonly();
  readonly facturacionElectronica = computed(() => this._empresa()?.facturacionElectronica ?? false);

  constructor() {
    this.fiscalService.getEmpresa().subscribe({
      next: e => this._empresa.set(e),
      error: () => {},
    });
  }

  set(e: EmpresaFiscal) {
    this._empresa.set(e);
  }
}
