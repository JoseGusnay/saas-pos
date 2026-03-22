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
      <div class="stc__row stc__row--main">
        <div class="stc__row-info">
          <span class="stc__row-label">Rastrear stock</span>
          <small class="stc__row-hint">Controla entradas, salidas y disponibilidad por sucursal</small>
        </div>
        <app-toggle-switch formControlName="stockTrackable"></app-toggle-switch>
      </div>

      @if (isTracking) {
        <div class="stc__toggles">
          <div class="stc__row">
            <div class="stc__row-info">
              <span class="stc__row-label">Manejo de lotes</span>
              <small class="stc__row-hint">Identifica cada entrada de mercancía por lote único</small>
            </div>
            <app-toggle-switch formControlName="trackLots"></app-toggle-switch>
          </div>

          <div class="stc__row">
            <div class="stc__row-info">
              <span class="stc__row-label">Control de caducidad</span>
              <small class="stc__row-hint">Alerta cuando los lotes estén próximos a vencer</small>
            </div>
            <app-toggle-switch formControlName="trackExpiry"></app-toggle-switch>
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

      &__row--main {
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      &__toggles {
        display: flex;
        flex-direction: column;
        gap: 0;
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        overflow: hidden;
      }

      &__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 16px;
        background: var(--color-bg-surface);
        transition: background-color var(--transition-fast);

        & + & {
          border-top: 1px solid var(--color-border-light);
        }

        &:hover { background: var(--color-bg-hover); }
      }

      &__row-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      &__row-label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-main);
      }

      &__row-hint {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
      }

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
