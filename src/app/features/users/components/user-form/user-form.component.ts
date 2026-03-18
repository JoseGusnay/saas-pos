import { lucideUser, lucideMail, lucideShield, lucideMapPin, lucideCheck, lucideX, lucideLock, lucideSave, lucideSearch, lucideEye, lucideEyeOff, lucidePhone, lucideGlobe, lucideMessageCircle } from '@ng-icons/lucide';


import { Component, Input, Output, EventEmitter, OnInit, signal, inject, computed, effect } from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { NgIconComponent, provideIcons } from '@ng-icons/core';

import { UsersService, TenantUser } from '../../services/users.service';
import { RolesService, Role } from '../../services/roles.service';
import { BranchService } from '../../../../core/services/branch.service';
import { Branch } from '../../../../core/models/branch.models';
import { ToastService } from '../../../../core/services/toast.service';
import { finalize } from 'rxjs';


@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgIconComponent
  ],

  providers: [
    provideIcons({
      lucideUser, lucideMail, lucideShield, lucideMapPin,
      lucideCheck, lucideX, lucideSave, lucideLock, lucideSearch,
      lucideEye, lucideEyeOff, lucidePhone, lucideGlobe, lucideMessageCircle
    })


  ],
  template: `
    <div class="user-form-container">
      <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="premium-form">
        
        <fieldset [disabled]="isSubmitting()" style="border: none; padding: 0; margin: 0; display: contents;">
          <!-- basic info -->
          <div class="form-section">
            <h3 class="section-title">Información Personal</h3>
            
            <div class="form-grid">
              <div class="form-group" [class.has-error]="userForm.get('firstName')?.invalid && userForm.get('firstName')?.touched">
                <label for="firstName">Nombre</label>
                <div class="input-wrapper">
                  <ng-icon name="lucideUser"></ng-icon>
                  <input id="firstName" type="text" formControlName="firstName" placeholder="Ej: Juan">
                </div>
                @if (userForm.get('firstName')?.invalid && userForm.get('firstName')?.touched) {
                  <small class="error-msg">El nombre es requerido</small>
                }
              </div>

              <div class="form-group">
                <label for="lastName">Apellido</label>
                <div class="input-wrapper">
                  <ng-icon name="lucideUser"></ng-icon>
                  <input id="lastName" type="text" formControlName="lastName" placeholder="Ej: Pérez">
                </div>
              </div>
            </div>

            <div class="form-group" [class.has-error]="userForm.get('email')?.invalid && userForm.get('email')?.touched">
              <label for="email">Correo Electrónico</label>
              <div class="input-wrapper">
                <ng-icon name="lucideMail"></ng-icon>
                <input id="email" type="email" formControlName="email" placeholder="usuario@empresa.com">
              </div>
              @if (userForm.get('email')?.invalid && userForm.get('email')?.touched) {
                <small class="error-msg">
                  {{ userForm.get('email')?.errors?.['required'] ? 'El correo es requerido' : 'Formato de correo inválido' }}
                </small>
              }
            </div>

            <div class="form-grid">
               <div class="form-group">
                <label for="countryCode">Cód. País</label>
                <div class="input-wrapper">
                  <ng-icon name="lucideGlobe"></ng-icon>
                  <input id="countryCode" type="text" formControlName="countryCode" placeholder="+593">
                </div>
              </div>
              <div class="form-group">
                <label for="phone">Teléfono (WhatsApp)</label>
                <div class="input-wrapper">
                  <ng-icon name="lucidePhone"></ng-icon>
                  <input id="phone" type="text" formControlName="phone" placeholder="988888888">
                </div>
              </div>
            </div>

            <div class="form-group password-group">
              @if (isEdit) {

                <div class="password-toggle-wrapper">
                  <button type="button" class="btn-toggle" (click)="togglePasswordChange()">
                    <ng-icon [name]="showPasswordFields() ? 'lucideX' : 'lucideLock'"></ng-icon>
                    <span>{{ showPasswordFields() ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña' }}</span>
                  </button>
                </div>
              } @else {
                <div class="form-switches secondary-switches">
                  <div class="form-check compact">
                    <input id="autoGenerate" type="checkbox" [(ngModel)]="autoGeneratePassword" [ngModelOptions]="{standalone: true}">
                    <label for="autoGenerate">Generar contraseña segura automáticamente</label>
                  </div>
                </div>
              }

              @if ((!isEdit || showPasswordFields()) && !autoGeneratePassword()) {
                <div class="password-input-container animation-slide-down">
                  <label for="passwordRaw">{{ isEdit ? 'Nueva Contraseña' : 'Contraseña Temporal' }}</label>
                  <div class="input-wrapper" [class.has-error]="userForm.get('passwordRaw')?.invalid && userForm.get('passwordRaw')?.touched">
                    <ng-icon name="lucideLock"></ng-icon>
                    <input 
                      id="passwordRaw" 
                      [type]="showPassword() ? 'text' : 'password'" 
                      formControlName="passwordRaw" 
                      placeholder="••••••••"
                      (input)="passwordValue.set($any($event.target).value)"
                    >
                    <button type="button" class="eye-toggle" (click)="showPassword.set(!showPassword())">
                      <ng-icon [name]="showPassword() ? 'lucideEyeOff' : 'lucideEye'"></ng-icon>
                    </button>
                  </div>
                  @if (userForm.get('passwordRaw')?.invalid && userForm.get('passwordRaw')?.touched) {
                    <small class="error-msg">
                      {{ userForm.get('passwordRaw')?.hasError('required') ? 'La contraseña es requerida' : 'Mínimo 8 caracteres' }}
                    </small>
                  }
                  
                  <!-- Strength Indicator -->
                  @if (passwordValue()) {
                    <div class="strength-meter">
                      <div class="meter-bar">
                        <div class="bar-fill" [style.width]="passwordStrength().percent + '%'" [style.background]="passwordStrength().color"></div>
                      </div>
                      <div class="meter-label" [style.color]="passwordStrength().color">
                        {{ passwordStrength().label }}
                      </div>
                    </div>
                    
                    <ul class="strength-requirements">
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

                  <p class="input-hint">
                    {{ isEdit ? 'Ingresa la nueva contraseña para este usuario.' : 'El usuario podrá cambiarla en su primer inicio de sesión.' }}
                  </p>
                </div>
              }

              @if (!isEdit && (autoGeneratePassword() || passwordValue())) {
                <div class="form-switches whatsapp-notification animation-slide-down">
                  <div class="form-check premium-check">
                    <input id="sendWhatsApp" type="checkbox" [(ngModel)]="sendWhatsApp" [ngModelOptions]="{standalone: true}">
                    <label for="sendWhatsApp">
                      <ng-icon name="lucideMessageCircle"></ng-icon>
                      Enviar credenciales por WhatsApp al usuario
                    </label>
                  </div>
                </div>
              }
            </div>

          </div>

          <!-- Assignments -->
          <div class="form-section">
            <h3 class="section-title">Roles y Accesos</h3>
            
            <div class="form-group">
              <label>Roles del Sistema</label>
              <div class="search-select-container">
                <div class="chips-wrapper" *ngIf="selectedRoleIds().length > 0">
                  @for (roleId of selectedRoleIds(); track roleId) {
                    <div class="chip">
                      <span>{{ getRoleName(roleId) }}</span>
                      <button type="button" (click)="toggleRole(roleId)" class="chip-remove">
                        <ng-icon name="lucideX"></ng-icon>
                      </button>
                    </div>
                  }
                </div>
                <div class="search-input-wrapper">
                  <ng-icon name="lucideSearch" class="search-icon"></ng-icon>
                  <input 
                    type="text" 
                    placeholder="Buscar y asignar roles..." 
                    (focus)="roleDropdownOpen.set(true)"
                    (input)="onRoleSearch($event)"
                    [value]="roleSearchText()"
                  >
                  <div class="dropdown-results" *ngIf="roleDropdownOpen() && filteredRoles().length > 0">
                    @for (role of filteredRoles(); track role.id) {
                      <div class="result-item" (click)="selectRole(role.id)">
                        <ng-icon name="lucideShield"></ng-icon>
                        <span>{{ role.name }}</span>
                      </div>
                    }
                  </div>
                   <!-- Backdrop overlay to close dropdown -->
                  <div class="dropdown-backdrop" *ngIf="roleDropdownOpen()" (click)="roleDropdownOpen.set(false)"></div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Sucursales Asignadas</label>
              <div class="search-select-container">
                <div class="chips-wrapper" *ngIf="selectedBranchIds().length > 0">
                  @for (branchId of selectedBranchIds(); track branchId) {
                    <div class="chip">
                      <span>{{ getBranchName(branchId) }}</span>
                      <button type="button" (click)="toggleBranch(branchId)" class="chip-remove">
                        <ng-icon name="lucideX"></ng-icon>
                      </button>
                    </div>
                  }
                </div>
                <div class="search-input-wrapper">
                  <ng-icon name="lucideSearch" class="search-icon"></ng-icon>
                  <input 
                    type="text" 
                    placeholder="Buscar y asignar sucursales..." 
                    (focus)="branchDropdownOpen.set(true)"
                    (input)="onBranchSearch($event)"
                    [value]="branchSearchText()"
                  >
                  <div class="dropdown-results" *ngIf="branchDropdownOpen() && filteredBranches().length > 0">
                    @for (branch of filteredBranches(); track branch.id) {
                      <div class="result-item" (click)="selectBranch(branch.id)">
                        <ng-icon name="lucideMapPin"></ng-icon>
                        <span>{{ branch.name }}</span>
                      </div>
                    }
                  </div>
                  <div class="dropdown-backdrop" *ngIf="branchDropdownOpen()" (click)="branchDropdownOpen.set(false)"></div>
                </div>
              </div>
            </div>

          </div>

          <!-- Status -->
          <div class="form-section">
            <h3 class="section-title">Ajustes y Estado</h3>
            <div class="form-switches">
              <div class="form-check">
                <input id="isActive" type="checkbox" formControlName="isActive">
                <label for="isActive">Usuario activo</label>
              </div>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  `,


  styles: [`
    .user-form-container {
      padding: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .premium-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    }


    .section-title {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-main);
      }
    }

    .input-wrapper {
      position: relative;
      display: block;

      ng-icon {
        position: absolute;
        left: 0.875rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-text-muted);
        font-size: 1rem;
        z-index: 5;
      }

      input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.625rem 2.875rem 0.625rem 2.5rem;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        color: var(--color-text-main);
        transition: var(--transition-fast);
        outline: none;
        display: block;



        &::placeholder {
          color: var(--color-text-muted);
        }

        &:focus {
          border-color: var(--color-accent-primary);
          box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
          outline: none;
        }
      }
    }

    .input-hint {
       font-size: var(--font-size-xs);
       color: var(--color-text-muted);
       margin-top: 0.25rem;
    }

    .search-select-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: var(--color-bg-hover);
      padding: 0.75rem;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border-subtle);
    }
    
    .chips-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    
    .chip {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      padding: 0.25rem 0.5rem 0.25rem 0.75rem;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 13px;
      color: var(--color-text-main);
      font-weight: 500;
      box-shadow: var(--shadow-sm);
      animation: fadeIn 0.2s ease-out;
      
      .chip-remove {
        background: transparent;
        border: none;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
        cursor: pointer;
        border-radius: 50%;
        transition: all 0.2s;
        
        &:hover {
          background: rgba(var(--color-danger-rgb), 0.1);
          color: var(--color-danger);
        }
        
        ng-icon { font-size: 14px; }
      }
    }
    
    .search-input-wrapper {
      position: relative;
      
      .search-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-text-muted);
        font-size: 14px;
        z-index: 2;
      }
      
      input {
        width: 100%;
        padding: 0.5rem 0.75rem 0.5rem 2.25rem;
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        font-size: 13px;
        color: var(--color-text-main);
        outline: none;
        transition: all 0.2s;
        
        &::placeholder {
          color: var(--color-text-muted);
        }
        
        &:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
        }
      }
    }
    
    .dropdown-results {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
      animation: slideInDown 0.2s ease-out;
    }
    
    .result-item {
      padding: 0.625rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      font-size: 13px;
      color: var(--color-text-soft);
      transition: all 0.2s;
      
      &:hover {
        background: var(--color-bg-hover);
        color: var(--color-primary);
        
        ng-icon { color: var(--color-primary); }
      }
      
      ng-icon {
        font-size: 1rem;
        color: var(--color-text-muted);
      }
    }
    
    .dropdown-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999;
      background: transparent;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes slideInDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }


    .form-switches {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }

    .form-check {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;

      input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
        accent-color: var(--color-accent-primary);
        cursor: pointer;
      }

      label {
        font-size: var(--font-size-base);
        color: var(--color-text-main);
        cursor: pointer;
      }
    }

    .password-group {
      margin-top: 0.5rem;
    }

    .password-toggle-wrapper {
      display: flex;
      justify-content: flex-start;
    }

    .btn-toggle {
      background: var(--color-bg-hover);
      border: 1px solid var(--color-border-light);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: var(--font-size-sm);
      color: var(--color-text-main);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: var(--color-bg-surface);
        border-color: var(--color-accent-primary);
        color: var(--color-accent-primary);
      }

      ng-icon {
        font-size: 1.1rem;
      }
    }

    .password-input-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      width: 100%;
      box-sizing: border-box;
      background: rgba(var(--color-primary-rgb), 0.03);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--color-border-subtle);
      margin-top: 0.75rem;
    }


    .animation-slide-down {
      animation: slideInDown 0.3s ease-out;
    }

    .secondary-switches {
      padding-top: 0;
      margin-top: -0.5rem;
    }

    .form-check.compact {
      label {
        font-size: 13px;
        color: var(--color-text-soft);
      }
    }

    .whatsapp-notification {
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(37, 211, 102, 0.05);
      border-radius: var(--radius-md);
      border: 1px solid rgba(37, 211, 102, 0.2);
      
      .premium-check {
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
        
        input[type="checkbox"] {
          accent-color: #25D366;
          cursor: pointer;
        }
      }
    }


    .eye-toggle {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      z-index: 10;
      transition: all 0.2s;
      
      &:hover { color: var(--color-primary); }
      ng-icon { font-size: 1.1rem; }
    }



    .strength-meter {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      
      .meter-bar {
        height: 4px;
        background: var(--color-bg-hover);
        border-radius: 2px;
        overflow: hidden;
        
        .bar-fill {
          height: 100%;
          transition: all 0.3s ease;
        }
      }
      
      .meter-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
    }

    .strength-requirements {
      list-style: none;
      padding: 0;
      margin: 0.75rem 0 0.5rem 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.375rem;
      
      li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 12px;
        color: var(--color-text-muted);
        transition: all 0.2s;
        
        ng-icon { 
          font-size: 0.875rem; 
          color: var(--color-danger);
        }
        
        &.met {
          color: var(--color-success);
          ng-icon { color: var(--color-success); }
        }
      }
    }

    .error-msg {
      font-size: var(--font-size-xs);
      color: var(--color-danger-text);
      margin-top: 0.25rem;
      display: block;
    }

    .has-error {
      .input-wrapper input {
        border-color: var(--color-danger-text) !important;
        background-color: rgba(var(--color-danger-rgb), 0.02) !important;
      }
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

  roles = signal<Role[]>([]);
  branches = signal<Branch[]>([]);

  selectedRoleIds = signal<string[]>([]);
  selectedBranchIds = signal<string[]>([]);

  roleSearchText = signal('');
  branchSearchText = signal('');
  
  roleDropdownOpen = signal(false);
  branchDropdownOpen = signal(false);
  showPasswordFields = signal(false);
  showPassword = signal(false);
  passwordValue = signal('');
  autoGeneratePassword = signal(false);
  sendWhatsApp = signal(false);





  filteredRoles = computed(() => {
    const search = this.roleSearchText().toLowerCase();
    const selected = this.selectedRoleIds();
    return this.roles().filter(r => 
      !selected.includes(r.id) && 
      (r.name.toLowerCase().includes(search) || (r.displayName?.toLowerCase().includes(search)))
    );
  });

  filteredBranches = computed(() => {
    const search = this.branchSearchText().toLowerCase();
    const selected = this.selectedBranchIds();
    return this.branches().filter(b => 
      !selected.includes(b.id) && 
      b.name.toLowerCase().includes(search)
    );
  });

  passwordStrength = computed(() => {
    const pwd = this.passwordValue() || '';
    const met = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd)
    };

    
    const count = Object.values(met).filter(Boolean).length;
    let label = 'Débil';
    let color = 'var(--color-danger)';
    let percent = 33;

    if (count === 2) {
      label = 'Media';
      color = 'var(--color-warning)';
      percent = 66;
    } else if (count === 3) {
      label = 'Segura';
      color = 'var(--color-success)';
      percent = 100;
    }

    return { label, color, percent, met };
  });



  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: [''],
      passwordRaw: [''],
      countryCode: ['+593'],
      phone: [''],
      isActive: [true]
    });

    // Reactividad para validaciones de password
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
    this.loadOptions();
    if (this.user) {
      this.isEdit = true;
      this.userForm.patchValue({
        email: this.user.email,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        countryCode: this.user.countryCode || '+593',
        phone: this.user.phone,
        isActive: this.user.isActive
      });

      this.selectedRoleIds.set(this.user.roles.map(r => r.id));
      this.selectedBranchIds.set(this.user.branches.map(b => b.id));
    }
  }


  loadOptions() {
    this.rolesService.getAll({ limit: 100 }).subscribe(res => this.roles.set(res.data || []));
    this.branchService.findAll({ limit: 100 }).subscribe((res: any) => this.branches.set(res.data || []));
  }

  isRoleSelected(id: string) { return this.selectedRoleIds().includes(id); }
  isBranchSelected(id: string) { return this.selectedBranchIds().includes(id); }

  toggleRole(id: string) {
    const current = this.selectedRoleIds();
    if (current.includes(id)) {
      this.selectedRoleIds.set(current.filter(rid => rid !== id));
    } else {
      this.selectedRoleIds.set([...current, id]);
    }
  }

  toggleBranch(id: string) {
    const current = this.selectedBranchIds();
    if (current.includes(id)) {
      this.selectedBranchIds.set(current.filter(bid => bid !== id));
    } else {
      this.selectedBranchIds.set([...current, id]);
    }
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    this.isSubmitting.set(true);
    const formData: any = {
      ...this.userForm.value,
      roleIds: this.selectedRoleIds(),
      branchIds: this.selectedBranchIds(),
      sendWhatsApp: this.sendWhatsApp()
    };

    // Si auto-generar está activo, no enviar passwordRaw (el backend la generará)
    if (this.autoGeneratePassword()) {
      delete formData.passwordRaw;
    }


    // Si es edición y no se activó el cambio de contraseña, eliminar el campo del envío
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
          console.error('Error saving user:', err);
        }

      });
  }

  onRoleSearch(event: any) {
    this.roleSearchText.set(event.target.value);
    this.roleDropdownOpen.set(true);
  }

  onBranchSearch(event: any) {
    this.branchSearchText.set(event.target.value);
    this.branchDropdownOpen.set(true);
  }

  getRoleName(id: string) {
    return this.roles().find(r => r.id === id)?.name || id;
  }

  getBranchName(id: string) {
    return this.branches().find(b => b.id === id)?.name || id;
  }

  selectRole(id: string) {
    this.toggleRole(id);
    this.roleSearchText.set('');
    this.roleDropdownOpen.set(false);
  }

  selectBranch(id: string) {
    this.toggleBranch(id);
    this.branchSearchText.set('');
    this.branchDropdownOpen.set(false);
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
    this.userForm.reset({
      countryCode: '+593',
      isActive: true
    });
    this.selectedRoleIds.set([]);
    this.selectedBranchIds.set([]);
    this.passwordValue.set('');
    this.showPasswordFields.set(false);
  }

  hasUnsavedChanges(): boolean {
    const isFormDirty = this.userForm.dirty;
    
    // Si estamos editando, comparar IDs con los originales
    if (this.isEdit && this.user) {
      const rolesChanged = JSON.stringify(this.selectedRoleIds().sort()) !== JSON.stringify(this.user.roles.map(r => r.id).sort());
      const branchesChanged = JSON.stringify(this.selectedBranchIds().sort()) !== JSON.stringify(this.user.branches.map(b => b.id).sort());
      return isFormDirty || rolesChanged || branchesChanged;
    }

    // Si es nuevo, ver si hay algo escrito o seleccionado
    const hasRoles = this.selectedRoleIds().length > 0;
    const hasBranches = this.selectedBranchIds().length > 0;
    return isFormDirty || hasRoles || hasBranches;
  }
}


