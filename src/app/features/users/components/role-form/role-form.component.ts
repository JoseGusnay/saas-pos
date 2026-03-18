import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { RolesService, Role } from '../../services/roles.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideShield,
  lucideCheck,
  lucideX,
  lucideChevronDown,
  lucideLayoutDashboard,
  lucidePackage,
  lucideTags,
  lucideShoppingCart,
  lucideUsers,
  lucideShieldCheck,
  lucideStore,
  lucideFileText
} from '@ng-icons/lucide';

export const AllPermissions = [
  'dashboard.view',
  'product.view', 'product.create', 'product.update', 'product.delete',
  'category.view', 'category.create', 'category.update', 'category.delete',
  'order.view', 'order.create', 'order.update', 'order.delete',
  'customer.view', 'customer.create', 'customer.update', 'customer.delete',
  'report.view', 'report.export',
  'tenant_user.view', 'tenant_user.create', 'tenant_user.update', 'tenant_user.delete',
  'role.view', 'role.create', 'role.update', 'role.delete',
  'branch.view', 'branch.create', 'branch.update', 'branch.delete'
];

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideShield, lucideCheck, lucideX, lucideChevronDown,
      lucideLayoutDashboard, lucidePackage, lucideTags,
      lucideShoppingCart, lucideUsers, lucideShieldCheck,
      lucideStore, lucideFileText
    })
  ],
  template: `
    <div class="role-form-container">
      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando información del rol...</p>
        </div>
      } @else {
        <form [formGroup]="roleForm" (ngSubmit)="onSubmit()" class="premium-form">
          <div class="form-sections">
            <!-- Información Básica -->
            <section class="form-section">
              <h3 class="section-title">Información Básica</h3>
              
              <div class="form-grid">
                <div class="form-group full-width" [class.has-error]="roleForm.get('name')?.invalid && roleForm.get('name')?.touched">
                  <label for="name">Nombre del Rol</label>
                  <div class="input-wrapper">
                    <ng-icon name="lucideShield" class="input-icon"></ng-icon>
                    <input 
                      id="name" 
                      type="text" 
                      formControlName="name" 
                      placeholder="Ej. Administrador, Vendedor..."
                    >
                    @if (roleForm.get('name')?.valid && roleForm.get('name')?.value) {
                      <ng-icon name="lucideCheck" class="status-icon success"></ng-icon>
                    }
                  </div>
                  @if (roleForm.get('name')?.invalid && roleForm.get('name')?.touched) {
                    <small class="error-msg">
                      {{ roleForm.get('name')?.hasError('required') ? 'El nombre es requerido' : 'Mínimo 3 caracteres' }}
                    </small>
                  }
                </div>
              </div>
            </section>

            <!-- Matriz de Permisos -->
            <section class="form-section">
              <h3 class="section-title">Matriz de Permisos</h3>
              <p class="input-hint">Define los accesos para este rol seleccionando los módulos correspondientes.</p>

              <div class="permissions-matrix">
                @for (group of permissionGroups; track group.title) {
                  <div class="permission-group">
                    <div class="group-header">
                      <div class="form-check">
                        <input 
                          [id]="group.title"
                          type="checkbox" 
                          [checked]="isGroupFullyChecked(group)"
                          [indeterminate]="isGroupHalfChecked(group)"
                          (change)="toggleGroup(group, $event)"
                        >
                        <label [for]="group.title" class="group-title">
                          <ng-icon [name]="getGroupIcon(group.title)" class="group-icon"></ng-icon>
                          {{ group.title }}
                        </label>
                      </div>
                    </div>

                    <div class="group-permissions">
                      @for (permKey of group.keys; track permKey) {
                        <div class="permission-item">
                          <div class="form-check compact">
                            <input 
                              [id]="permKey"
                              type="checkbox" 
                              [checked]="isPermissionSelected(permKey)"
                              (change)="togglePermission(permKey, $event)"
                            >
                            <label [for]="permKey">{{ permKey.split('.')[1] | titlecase }}</label>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .role-form-container {
      background: var(--color-bg-surface);
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;
      color: var(--color-text-muted);

      .spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid var(--color-border-light);
        border-top-color: var(--color-accent-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    .premium-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;

      .form-sections {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;

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
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;

        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }

        .full-width { grid-column: span 2; }
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

        .input-wrapper {
          position: relative;
          display: block;
          width: 100%;

          .input-icon {
            position: absolute;
            left: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-muted);
            font-size: 1rem;
            z-index: 5;
            pointer-events: none;
          }

          input {
            width: 100%;
            box-sizing: border-box;
            padding: 0.625rem 0.875rem 0.625rem 2.5rem;
            background: var(--color-bg-surface);
            border: 1px solid var(--color-border-light);
            border-radius: var(--radius-md);
            font-size: var(--font-size-base);
            color: var(--color-text-main);
            transition: var(--transition-fast);
            outline: none;
            display: block;

            &:focus {
              border-color: var(--color-accent-primary);
              box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
            }

            &::placeholder { color: var(--color-text-muted); }
          }

          .status-icon {
            position: absolute;
            right: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1rem;
            z-index: 5;

            &.success { color: var(--color-success-text); }
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
        input {
          border-color: var(--color-danger-text) !important;
          background-color: rgba(var(--color-danger-rgb), 0.02) !important;
        }
      }

      .input-hint {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        margin-top: -0.5rem;
      }
    }

    .permissions-matrix {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .permission-group {
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;

      .group-header {
        background: var(--color-bg-hover);
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--color-border-light);
      }

      .group-permissions {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
        padding: 1rem;
        background: var(--color-bg-surface);
      }
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
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      &.compact label {
        font-size: var(--font-size-sm);
      }

      .group-title {
        font-weight: 600;
        font-size: var(--font-size-base);
      }

      .group-icon {
        color: var(--color-text-muted);
        font-size: 1.1rem;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class RoleFormComponent implements OnInit {
  @Input() roleId?: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private toastService = inject(ToastService);

  roleForm!: FormGroup;
  isSubmitting = signal(false);
  isLoading = signal(false);

  // Group permissions logically for the UI matrix
  permissionGroups = [
    { title: 'Dashboard', keys: ['dashboard.view'] },
    { title: 'Productos', keys: ['product.view', 'product.create', 'product.update', 'product.delete'] },
    { title: 'Categorías', keys: ['category.view', 'category.create', 'category.update', 'category.delete'] },
    { title: 'Órdenes', keys: ['order.view', 'order.create', 'order.update', 'order.delete'] },
    { title: 'Clientes', keys: ['customer.view', 'customer.create', 'customer.update', 'customer.delete'] },
    { title: 'Reportes', keys: ['report.view', 'report.export'] },
    { title: 'Usuarios', keys: ['tenant_user.view', 'tenant_user.create', 'tenant_user.update', 'tenant_user.delete'] },
    { title: 'Roles y Permisos', keys: ['role.view', 'role.create', 'role.update', 'role.delete'] },
    { title: 'Sucursales', keys: ['branch.view', 'branch.create', 'branch.update', 'branch.delete'] }
  ];

  // Store backend UUID permissions
  allBackendPermissions: any[] = [];
  selectedPermissions = signal<Set<string>>(new Set<string>());

  ngOnInit() {
    this.initForm();
    this.loadPermissions();
  }

  initForm() {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  loadPermissions() {
    this.isLoading.set(true);
    // Fetch system permissions first
    this.rolesService.getPermissions().pipe(
      finalize(() => {
        if (!this.roleId) this.isLoading.set(false);
      })
    ).subscribe({
      next: (perms) => {
        this.allBackendPermissions = Array.isArray(perms) ? perms : [];
        if (this.roleId) {
          this.loadRole();
        }
      },
      error: () => {
        this.toastService.error('Error al cargar permisos del sistema');
      }
    });
  }

  loadRole() {
    this.rolesService.getAll({ limit: 100 }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res) => {
        // Handle paginated responses where data is in res.data
        const rolesList = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
        const role = rolesList.find((r: Role) => r.id === this.roleId);

        if (role) {
          this.roleForm.patchValue({ name: role.name });

          if (role.name === 'SUPER_ADMIN') {
            this.roleForm.get('name')?.disable();
          }

          if (role.permissions) {
            const mappedIds: Set<string> = new Set<string>(role.permissions.map((p: any) => p.id));
            this.selectedPermissions.set(mappedIds);
          }
        }
      },
      error: () => {
        this.toastService.error('Error al cargar el rol');
      }
    });
  }

  isPermissionSelected(permName: string): boolean {
    if (!Array.isArray(this.allBackendPermissions)) return false;
    const perm = this.allBackendPermissions.find(p => p.name === permName);
    return perm ? this.selectedPermissions().has(perm.id) : false;
  }

  togglePermission(permName: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const perm = this.allBackendPermissions.find(p => p.name === permName);
    if (!perm) return;

    const newSet = new Set<string>(this.selectedPermissions());
    if (checked) {
      newSet.add(perm.id);
    } else {
      newSet.delete(perm.id);
    }
    this.selectedPermissions.set(newSet);
  }

  toggleGroup(group: { title: string, keys: string[] }, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const newSet = new Set<string>(this.selectedPermissions());

    group.keys.forEach((key: string) => {
      const perm = this.allBackendPermissions.find(p => p.name === key);
      if (perm) {
        if (checked) newSet.add(perm.id);
        else newSet.delete(perm.id);
      }
    });

    this.selectedPermissions.set(newSet);
  }

  isGroupHalfChecked(group: { title: string, keys: string[] }): boolean {
    const checkedCount = group.keys.filter((k: string) => this.isPermissionSelected(k)).length;
    return checkedCount > 0 && checkedCount < group.keys.length;
  }

  isGroupFullyChecked(group: { title: string, keys: string[] }): boolean {
    const checkedCount = group.keys.filter((k: string) => this.isPermissionSelected(k)).length;
    return checkedCount === group.keys.length && group.keys.length > 0;
  }

  getGroupIcon(title: string): string {
    const icons: Record<string, string> = {
      'Dashboard': 'lucideLayoutDashboard',
      'Productos': 'lucidePackage',
      'Categorías': 'lucideTags',
      'Órdenes': 'lucideShoppingCart',
      'Clientes': 'lucideUsers',
      'Reportes': 'lucideFileText',
      'Usuarios': 'lucideUsers',
      'Roles y Permisos': 'lucideShieldCheck',
      'Sucursales': 'lucideStore'
    };
    return icons[title] || 'lucideShield';
  }


  onSubmit() {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const data = {
      name: this.roleForm.getRawValue().name,
      permissionIds: Array.from(this.selectedPermissions())
    };

    const request$ = this.roleId
      ? this.rolesService.update(this.roleId, data)
      : this.rolesService.create(data);

    request$.subscribe({
      next: () => {
        this.toastService.success(`Rol ${this.roleId ? 'actualizado' : 'creado'} correctamente`);
        this.saved.emit();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Error al guardar el rol');
        this.isSubmitting.set(false);
      }
    });
  }

  resetForm() {
    this.roleForm.reset();
    this.selectedPermissions.set(new Set<string>());
    this.isLoading.set(false);
  }

  hasUnsavedChanges(): boolean {
    const isFormDirty = this.roleForm.dirty;
    const initialPerms = this.roleId ? Array.from(this.selectedPermissions()) : []; // This is a bit simplified as selectedPermissions starts with what was loaded
    // For a more accurate check, we should store the 'original' permissions after loadRole
    return isFormDirty || this.permissionsChanged();
  }

  private permissionsChanged(): boolean {
    // Basic check: if anything was toggled
    return this.selectedPermissions().size > 0 && !this.roleId; // If new and has perms
  }
}
