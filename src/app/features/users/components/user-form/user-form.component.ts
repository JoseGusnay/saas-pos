import { Component, Input, Output, EventEmitter, OnInit, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideLock, lucideCheck, lucideX, lucideEye, lucideEyeOff,
  lucideMessageCircle, lucideShield, lucideMapPin,
} from '@ng-icons/lucide';
import { Observable, finalize, map } from 'rxjs';

import { UsersService, TenantUser } from '../../services/users.service';
import { RolesService, Role } from '../../services/roles.service';
import { BranchService } from '../../../../core/services/branch.service';
import { Branch } from '../../../../core/models/branch.models';
import { ToastService } from '../../../../core/services/toast.service';

import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, NgIconComponent,
    FieldInputComponent, FieldToggleComponent, SearchSelectComponent,
  ],
  providers: [
    provideIcons({
      lucideLock, lucideCheck, lucideX, lucideEye, lucideEyeOff,
      lucideMessageCircle, lucideShield, lucideMapPin,
    })
  ],
  template: `
    <form [formGroup]="userForm" class="uf">

      <!-- ── Información Personal ──────────────────────────────── -->
      <div class="uf__divider"><span>Información Personal</span></div>

      <div class="uf__row">
        <app-field-input
          label="Nombre"
          formControlName="firstName"
          placeholder="Ej: Juan"
          prefixIcon="lucideUser"
          [required]="true"
          [errorMessages]="{ required: 'El nombre es requerido' }"
        ></app-field-input>

        <app-field-input
          label="Apellido"
          formControlName="lastName"
          placeholder="Ej: Pérez"
          prefixIcon="lucideUser"
          [optional]="true"
        ></app-field-input>
      </div>

      <app-field-input
        label="Correo Electrónico"
        formControlName="email"
        type="email"
        placeholder="usuario&#64;empresa.com"
        prefixIcon="lucideMail"
        [required]="true"
        [errorMessages]="{ required: 'El correo es requerido', email: 'Formato de correo inválido' }"
      ></app-field-input>

      <div class="uf__row">
        <app-field-input
          label="Cód. País"
          formControlName="countryCode"
          placeholder="+593"
          prefixIcon="lucideGlobe"
        ></app-field-input>

        <app-field-input
          label="Teléfono (WhatsApp)"
          formControlName="phone"
          type="tel"
          placeholder="988888888"
          prefixIcon="lucidePhone"
        ></app-field-input>
      </div>

      <!-- ── Contraseña ────────────────────────────────────────── -->
      <div class="uf__password-section">
        @if (isEdit) {
          <button type="button" class="uf__btn-toggle" (click)="togglePasswordChange()">
            <ng-icon [name]="showPasswordFields() ? 'lucideX' : 'lucideLock'"></ng-icon>
            <span>{{ showPasswordFields() ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña' }}</span>
          </button>
        } @else {
          <div class="uf__auto-gen-check">
            <input id="autoGenerate" type="checkbox" [checked]="autoGeneratePassword()" (change)="autoGeneratePassword.set(!autoGeneratePassword())">
            <label for="autoGenerate">Generar contraseña segura automáticamente</label>
          </div>
        }

        @if ((!isEdit || showPasswordFields()) && !autoGeneratePassword()) {
          <div class="uf__password-box">
            <label class="uf__label">{{ isEdit ? 'Nueva Contraseña' : 'Contraseña Temporal' }}</label>
            <div class="uf__password-input" [class.uf__password-input--error]="userForm.get('passwordRaw')?.invalid && userForm.get('passwordRaw')?.touched">
              <ng-icon name="lucideLock" class="uf__pwd-icon"></ng-icon>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="passwordRaw"
                placeholder="••••••••"
                (input)="passwordValue.set($any($event.target).value)"
              >
              <button type="button" class="uf__eye-toggle" (click)="showPassword.set(!showPassword())">
                <ng-icon [name]="showPassword() ? 'lucideEyeOff' : 'lucideEye'"></ng-icon>
              </button>
            </div>
            @if (userForm.get('passwordRaw')?.invalid && userForm.get('passwordRaw')?.touched) {
              <small class="uf__error">
                {{ userForm.get('passwordRaw')?.hasError('required') ? 'La contraseña es requerida' : 'Mínimo 8 caracteres' }}
              </small>
            }

            @if (passwordValue()) {
              <div class="uf__strength">
                <div class="uf__strength-bar">
                  <div class="uf__strength-fill" [style.width]="passwordStrength().percent + '%'" [style.background]="passwordStrength().color"></div>
                </div>
                <span class="uf__strength-label" [style.color]="passwordStrength().color">{{ passwordStrength().label }}</span>
              </div>
              <ul class="uf__requirements">
                <li [class.met]="passwordStrength().met.length">
                  <ng-icon [name]="passwordStrength().met.length ? 'lucideCheck' : 'lucideX'"></ng-icon>
                  Min. 8 caracteres
                </li>
                <li [class.met]="passwordStrength().met.upper">
                  <ng-icon [name]="passwordStrength().met.upper ? 'lucideCheck' : 'lucideX'"></ng-icon>
                  Una mayúscula
                </li>
                <li [class.met]="passwordStrength().met.number">
                  <ng-icon [name]="passwordStrength().met.number ? 'lucideCheck' : 'lucideX'"></ng-icon>
                  Un número
                </li>
              </ul>
            }

            <p class="uf__hint">
              {{ isEdit ? 'Ingresa la nueva contraseña para este usuario.' : 'El usuario podrá cambiarla en su primer inicio de sesión.' }}
            </p>
          </div>
        }

        @if (!isEdit && (autoGeneratePassword() || passwordValue())) {
          <div class="uf__whatsapp-check">
            <input id="sendWhatsApp" type="checkbox" [checked]="sendWhatsApp()" (change)="sendWhatsApp.set(!sendWhatsApp())">
            <label for="sendWhatsApp">
              <ng-icon name="lucideMessageCircle"></ng-icon>
              Enviar credenciales por WhatsApp al usuario
            </label>
          </div>
        }
      </div>

      <!-- ── Roles y Accesos ───────────────────────────────────── -->
      <div class="uf__divider"><span>Roles y Accesos</span></div>

      <div class="uf__field">
        <label class="uf__label">Roles del Sistema</label>
        <app-search-select
          placeholder="Seleccionar roles..."
          searchPlaceholder="Buscar roles..."
          [multiple]="true"
          [searchFn]="searchRolesFn"
          [initialOptions]="initialRoleOptions()"
          (selectionChange)="onRolesChange($event)"
        ></app-search-select>
      </div>

      <div class="uf__field">
        <label class="uf__label">Sucursales Asignadas</label>
        <app-search-select
          placeholder="Seleccionar sucursales..."
          searchPlaceholder="Buscar sucursales..."
          [multiple]="true"
          [searchFn]="searchBranchesFn"
          [initialOptions]="initialBranchOptions()"
          (selectionChange)="onBranchesChange($event)"
        ></app-search-select>
      </div>

      <!-- ── Estado ────────────────────────────────────────────── -->
      <div class="uf__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Usuario activo"
        description="Los usuarios inactivos no pueden iniciar sesión"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .uf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .uf__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .uf__divider {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
    }
    .uf__field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .uf__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }

    .uf__auto-gen-check {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: var(--color-accent-primary); cursor: pointer; }
      label { font-size: 13px; color: var(--color-text-soft); cursor: pointer; }
    }

    /* ── Password section ── */
    .uf__password-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .uf__btn-toggle {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      background: var(--color-bg-hover);
      border: 1px solid var(--color-border-light);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      color: var(--color-text-main);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      &:hover {
        background: var(--color-bg-surface);
        border-color: var(--color-accent-primary);
        color: var(--color-accent-primary);
      }
    }
    .uf__password-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: rgba(var(--color-primary-rgb), 0.03);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--color-border-subtle);
      animation: ufSlideDown 0.3s ease-out;
    }
    .uf__password-input {
      position: relative;
      display: flex;
      align-items: center;
      input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.625rem 2.875rem 0.625rem 2.5rem;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        color: var(--color-text-main);
        outline: none;
        transition: var(--transition-fast);
        font-family: inherit;
        &::placeholder { color: var(--color-text-muted); }
        &:focus { border-color: var(--color-accent-primary); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1); }
      }
      &--error input {
        border-color: var(--color-danger-text) !important;
        background-color: rgba(var(--color-danger-rgb), 0.02) !important;
      }
    }
    .uf__pwd-icon {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted);
      font-size: 1rem;
      z-index: 5;
      pointer-events: none;
    }
    .uf__eye-toggle {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      z-index: 10;
      transition: color 0.2s;
      &:hover { color: var(--color-accent-primary); }
    }
    .uf__error {
      font-size: var(--font-size-xs);
      color: var(--color-danger-text);
    }
    .uf__hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin: 0;
    }

    /* Strength meter */
    .uf__strength {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }
    .uf__strength-bar {
      height: 4px;
      background: var(--color-bg-hover);
      border-radius: 2px;
      overflow: hidden;
    }
    .uf__strength-fill {
      height: 100%;
      transition: all 0.3s ease;
    }
    .uf__strength-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .uf__requirements {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 12px;
        color: var(--color-text-muted);
        ng-icon { font-size: 0.875rem; color: var(--color-danger-text); }
        &.met {
          color: var(--color-success-text);
          ng-icon { color: var(--color-success-text); }
        }
      }
    }

    /* WhatsApp */
    .uf__whatsapp-check {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(37, 211, 102, 0.05);
      border-radius: var(--radius-md);
      border: 1px solid rgba(37, 211, 102, 0.2);
      animation: ufSlideDown 0.3s ease-out;
      input[type="checkbox"] {
        width: 1rem; height: 1rem;
        accent-color: #25D366;
        cursor: pointer;
      }
      label {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        color: #25D366;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        ng-icon { font-size: 1.25rem; }
      }
    }

    @keyframes ufSlideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class UserFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private rolesService = inject(RolesService);
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);

  @Input() user?: TenantUser;
  @Output() saved = new EventEmitter<TenantUser>();
  @Output() cancel = new EventEmitter<void>();

  userForm: FormGroup;
  isEdit = false;
  isSubmitting = signal(false);

  selectedRoleIds = signal<string[]>([]);
  selectedBranchIds = signal<string[]>([]);

  showPasswordFields = signal(false);
  showPassword = signal(false);
  passwordValue = signal('');
  autoGeneratePassword = signal(false);
  sendWhatsApp = signal(false);

  initialRoleOptions = signal<SearchSelectOption[]>([]);
  initialBranchOptions = signal<SearchSelectOption[]>([]);

  passwordStrength = computed(() => {
    const pwd = this.passwordValue() || '';
    const met = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
    };
    const count = Object.values(met).filter(Boolean).length;
    if (count === 3) return { label: 'Segura', color: 'var(--color-success)', percent: 100, met };
    if (count === 2) return { label: 'Media', color: 'var(--color-warning)', percent: 66, met };
    return { label: 'Débil', color: 'var(--color-danger)', percent: 33, met };
  });

  // Search functions for SearchSelectComponent
  searchRolesFn = (query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    return this.rolesService.getAll({ search: query, page, limit: 20 }).pipe(
      map((res: any) => ({
        data: (res.data || []).map((r: Role) => ({ value: r.id, label: r.name, icon: 'lucideShield' })),
        hasMore: (res.data?.length || 0) === 20,
      }))
    );
  };

  searchBranchesFn = (query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    return this.branchService.findAll({ search: query, page, limit: 20 }).pipe(
      map((res: any) => ({
        data: (res.data || []).map((b: Branch) => ({ value: b.id, label: b.name, icon: 'lucideMapPin' })),
        hasMore: (res.data?.length || 0) === 20,
      }))
    );
  };

  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: [''],
      passwordRaw: [''],
      countryCode: ['+593'],
      phone: [''],
      isActive: [true],
    });

    effect(() => {
      const auto = this.autoGeneratePassword();
      const passwordCtrl = this.userForm.get('passwordRaw');
      if (!this.isEdit && !auto) {
        passwordCtrl?.setValidators([Validators.required, Validators.minLength(8)]);
      } else {
        passwordCtrl?.clearValidators();
      }
      passwordCtrl?.updateValueAndValidity();
    });
  }

  ngOnInit() {
    if (this.user) {
      this.isEdit = true;
      this.userForm.patchValue({
        email: this.user.email,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        countryCode: this.user.countryCode || '+593',
        phone: this.user.phone,
        isActive: this.user.isActive,
      });

      this.selectedRoleIds.set(this.user.roles.map(r => r.id));
      this.selectedBranchIds.set(this.user.branches.map(b => b.id));

      this.initialRoleOptions.set(
        this.user.roles.map(r => ({ value: r.id, label: r.name, icon: 'lucideShield' }))
      );
      this.initialBranchOptions.set(
        this.user.branches.map(b => ({ value: b.id, label: b.name, icon: 'lucideMapPin' }))
      );
    }
  }

  onRolesChange(selection: any) {
    if (Array.isArray(selection)) {
      this.selectedRoleIds.set(selection.map((s: SearchSelectOption) => s.value));
    }
    this.userForm.markAsDirty();
  }

  onBranchesChange(selection: any) {
    if (Array.isArray(selection)) {
      this.selectedBranchIds.set(selection.map((s: SearchSelectOption) => s.value));
    }
    this.userForm.markAsDirty();
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    this.isSubmitting.set(true);
    const formData: any = {
      ...this.userForm.getRawValue(),
      roleIds: this.selectedRoleIds(),
      branchIds: this.selectedBranchIds(),
      sendWhatsApp: this.sendWhatsApp(),
    };

    if (this.autoGeneratePassword()) {
      delete formData.passwordRaw;
    }

    if (this.isEdit && (!this.showPasswordFields() || !formData.passwordRaw?.trim())) {
      delete formData.passwordRaw;
    }

    const action$ = this.isEdit
      ? this.usersService.update(this.user!.id, formData)
      : this.usersService.create(formData);

    action$.pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (res) => {
          this.userForm.markAsPristine();
          this.saved.emit(res);
        },
        error: (err) => {
          const msg = err?.error?.message?.[0] || err?.error?.message || 'Error al guardar el usuario';
          this.toastService.error(msg);
        },
      });
  }

  togglePasswordChange() {
    const isShowing = this.showPasswordFields();
    this.showPasswordFields.set(!isShowing);
    if (isShowing) {
      this.userForm.get('passwordRaw')?.setValue('');
      this.passwordValue.set('');
    }
  }

  resetForm() {
    this.user = undefined;
    this.isEdit = false;
    this.userForm.reset({ countryCode: '+593', isActive: true });
    this.selectedRoleIds.set([]);
    this.selectedBranchIds.set([]);
    this.initialRoleOptions.set([]);
    this.initialBranchOptions.set([]);
    this.passwordValue.set('');
    this.showPasswordFields.set(false);
    this.autoGeneratePassword.set(false);
    this.sendWhatsApp.set(false);
  }

  hasUnsavedChanges(): boolean {
    const isFormDirty = this.userForm.dirty;
    if (this.isEdit && this.user) {
      const rolesChanged = JSON.stringify(this.selectedRoleIds().sort()) !== JSON.stringify(this.user.roles.map(r => r.id).sort());
      const branchesChanged = JSON.stringify(this.selectedBranchIds().sort()) !== JSON.stringify(this.user.branches.map(b => b.id).sort());
      return isFormDirty || rolesChanged || branchesChanged;
    }
    return isFormDirty || this.selectedRoleIds().length > 0 || this.selectedBranchIds().length > 0;
  }
}
