import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { ControlContainer, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ToggleSwitchComponent } from '../../../../shared/components/ui/toggle-switch/toggle-switch';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';

@Component({
  selector: 'app-stock-tracking-config',
  standalone: true,
  imports: [ReactiveFormsModule, ToggleSwitchComponent, FieldInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  template: `
    <div class="stc">

      <!-- Toggle principal -->
      <div class="pff__toggle-row" (click)="stockTrackableToggle.toggle()">
        <div class="pff__toggle-info">
          <span class="pff__toggle-label">Rastrear stock</span>
          <small class="pff__toggle-hint">Controla entradas, salidas y disponibilidad por sucursal</small>
        </div>
        <app-toggle-switch #stockTrackableToggle formControlName="stockTrackable" (click)="$event.stopPropagation()"></app-toggle-switch>
      </div>

      @if (isTracking) {
        <div class="pff__toggle-group">
          <div class="pff__toggle-row" (click)="trackLotsToggle.toggle()">
            <div class="pff__toggle-info">
              <span class="pff__toggle-label">Manejo de lotes</span>
              <small class="pff__toggle-hint">Identifica cada entrada de mercancía por lote único</small>
            </div>
            <app-toggle-switch #trackLotsToggle formControlName="trackLots" (click)="$event.stopPropagation()"></app-toggle-switch>
          </div>

          <div class="pff__toggle-row" (click)="trackExpiryToggle.toggle()">
            <div class="pff__toggle-info">
              <span class="pff__toggle-label">Control de caducidad</span>
              <small class="pff__toggle-hint">Alerta cuando los lotes estén próximos a vencer</small>
            </div>
            <app-toggle-switch #trackExpiryToggle formControlName="trackExpiry" (click)="$event.stopPropagation()"></app-toggle-switch>
          </div>
        </div>

        <div class="stc__limits">
          <app-field-input
            formControlName="minimumStock"
            label="Stock mínimo"
            type="number"
            placeholder="Ej: 5"
            [optional]="true"
            [min]="0"
            hint="Alerta cuando el stock baje de este valor"
          ></app-field-input>

          <app-field-input
            formControlName="maximumStock"
            label="Stock máximo"
            type="number"
            placeholder="Ej: 100"
            [optional]="true"
            [min]="0"
            hint="Techo de referencia para reorden"
          ></app-field-input>
        </div>
      }
    </div>
  `,
  styles: [`
    .stc {
      display: flex;
      flex-direction: column;
      gap: 16px;

      &__limits {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
    }
  `]
})
export class StockTrackingConfigComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private fg = inject(ControlContainer).control as FormGroup;

  get isTracking(): boolean {
    return !!this.fg.get('stockTrackable')?.value;
  }

  ngOnInit() {
    this.fg.get('stockTrackable')?.valueChanges.subscribe(() => {
      this.cdr.markForCheck();
    });
  }
}
