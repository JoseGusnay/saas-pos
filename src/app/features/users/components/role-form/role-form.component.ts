import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { RolesService, Role } from '../../services/roles.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideShield, lucideCheck,
  lucideLayoutDashboard, lucidePackage, lucideTags,
  lucideShoppingCart, lucideUsers, lucideShieldCheck,
  lucideStore, lucideFileText
} from '@ng-icons/lucide';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, FieldInputComponent],
  providers: [
    provideIcons({
      lucideShield, lucideCheck,
      lucideLayoutDashboard, lucidePackage, lucideTags,
      lucideShoppingCart, lucideUsers, lucideShieldCheck,
      lucideStore, lucideFileText
    })
  ],
  template: `
    <div class="rf">
      @if (isLoading()) {
        <div class="rf__loading">
          <div class="rf__spinner"></div>
          <p>Cargando información del rol...</p>
        </div>
      } @else {
        <form [formGroup]="roleForm" class="rf__form">

          <div class="rf__divider"><span>Información Básica</span></div>

          <app-field-input
            label="Nombre del Rol"
            formControlName="name"
            placeholder="Ej. Administrador, Vendedor..."
            prefixIcon="lucideShield"
            [required]="true"
            [errorMessages]="{ required: 'El nombre es requerido', minlength: 'Mínimo 3 caracteres' }"
          ></app-field-input>

          <div class="rf__divider"><span>Matriz de Permisos</span></div>
          <p class="rf__hint">Define los accesos para este rol seleccionando los módulos correspondientes.</p>

          <div class="rf__matrix">
            @for (group of permissionGroups; track group.title) {
              <div class="rf__pgroup">
                <div class="rf__pgroup-header">
                  <div class="rf__check">
                    <input
                      [id]="group.title"
                      type="checkbox"
                      [checked]="isGroupFullyChecked(group)"
                      [indeterminate]="isGroupHalfChecked(group)"
                      (change)="toggleGroup(group, $event)"
                    >
                    <label [for]="group.title" class="rf__group-label">
                      <ng-icon [name]="getGroupIcon(group.title)"></ng-icon>
                      {{ group.title }}
                    </label>
                  </div>
                </div>
                <div class="rf__pgroup-body">
                  @for (permKey of group.keys; track permKey) {
                    <div class="rf__check rf__check--compact">
                      <input
                        [id]="permKey"
                        type="checkbox"
                        [checked]="isPermissionSelected(permKey)"
                        (change)="togglePermission(permKey, $event)"
                      >
                      <label [for]="permKey">{{ permKey.split('.')[1] | titlecase }}</label>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

        </form>
      }
    </div>
  `,
  styles: [`
    .rf__form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .rf__divider {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
    }
    .rf__hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin: -0.5rem 0 0;
    }
    .rf__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;
      color: var(--color-text-muted);
    }
    .rf__spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--color-border-light);
      border-top-color: var(--color-accent-primary);
      border-radius: 50%;
      animation: rfSpin 1s linear infinite;
    }

    /* ── Permissions matrix ── */
    .rf__matrix {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .rf__pgroup {
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .rf__pgroup-header {
      background: var(--color-bg-hover);
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border-light);
    }
    .rf__pgroup-body {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
      padding: 1rem;
      background: var(--color-bg-surface);
    }
    .rf__check {
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
      &--compact label {
        font-size: var(--font-size-sm);
      }
    }
    .rf__group-label {
      font-weight: 600;
      ng-icon {
        color: var(--color-text-muted);
        font-size: 1.1rem;
      }
    }

    @keyframes rfSpin {
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

  permissionGroups = [
    { title: 'Dashboard', keys: ['dashboard.view'] },
    { title: 'Productos', keys: ['product.view', 'product.create', 'product.update', 'product.delete'] },
    { title: 'Categorías', keys: ['category.view', 'category.create', 'category.update', 'category.delete'] },
    { title: 'Órdenes', keys: ['order.view', 'order.create', 'order.update', 'order.delete'] },
    { title: 'Clientes', keys: ['customer.view', 'customer.create', 'customer.update', 'customer.delete'] },
    { title: 'Reportes', keys: ['report.view', 'report.export'] },
    { title: 'Usuarios', keys: ['tenant_user.view', 'tenant_user.create', 'tenant_user.update', 'tenant_user.delete'] },
    { title: 'Roles y Permisos', keys: ['role.view', 'role.create', 'role.update', 'role.delete'] },
    { title: 'Sucursales', keys: ['branch.view', 'branch.create', 'branch.update', 'branch.delete'] },
  ];

  allBackendPermissions: any[] = [];
  selectedPermissions = signal<Set<string>>(new Set<string>());

  ngOnInit() {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
    });
    this.loadPermissions();
  }

  loadPermissions() {
    this.isLoading.set(true);
    this.rolesService.getPermissions().pipe(
      finalize(() => { if (!this.roleId) this.isLoading.set(false); })
    ).subscribe({
      next: (perms) => {
        this.allBackendPermissions = Array.isArray(perms) ? perms : [];
        if (this.roleId) this.loadRole();
      },
      error: () => this.toastService.error('Error al cargar permisos del sistema'),
    });
  }

  loadRole() {
    this.rolesService.getAll({ limit: 100 }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res) => {
        const rolesList = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
        const role = rolesList.find((r: Role) => r.id === this.roleId);
        if (role) {
          this.roleForm.patchValue({ name: role.name });
          if (role.name === 'SUPER_ADMIN') this.roleForm.get('name')?.disable();
          if (role.permissions) {
            this.selectedPermissions.set(new Set<string>(role.permissions.map((p: any) => p.id)));
          }
        }
      },
      error: () => this.toastService.error('Error al cargar el rol'),
    });
  }

  isPermissionSelected(permName: string): boolean {
    const perm = this.allBackendPermissions.find(p => p.name === permName);
    return perm ? this.selectedPermissions().has(perm.id) : false;
  }

  togglePermission(permName: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const perm = this.allBackendPermissions.find(p => p.name === permName);
    if (!perm) return;
    const newSet = new Set<string>(this.selectedPermissions());
    checked ? newSet.add(perm.id) : newSet.delete(perm.id);
    this.selectedPermissions.set(newSet);
  }

  toggleGroup(group: { title: string; keys: string[] }, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const newSet = new Set<string>(this.selectedPermissions());
    group.keys.forEach(key => {
      const perm = this.allBackendPermissions.find(p => p.name === key);
      if (perm) checked ? newSet.add(perm.id) : newSet.delete(perm.id);
    });
    this.selectedPermissions.set(newSet);
  }

  isGroupHalfChecked(group: { title: string; keys: string[] }): boolean {
    const count = group.keys.filter(k => this.isPermissionSelected(k)).length;
    return count > 0 && count < group.keys.length;
  }

  isGroupFullyChecked(group: { title: string; keys: string[] }): boolean {
    const count = group.keys.filter(k => this.isPermissionSelected(k)).length;
    return count === group.keys.length && group.keys.length > 0;
  }

  getGroupIcon(title: string): string {
    const icons: Record<string, string> = {
      'Dashboard': 'lucideLayoutDashboard', 'Productos': 'lucidePackage',
      'Categorías': 'lucideTags', 'Órdenes': 'lucideShoppingCart',
      'Clientes': 'lucideUsers', 'Reportes': 'lucideFileText',
      'Usuarios': 'lucideUsers', 'Roles y Permisos': 'lucideShieldCheck',
      'Sucursales': 'lucideStore',
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
      permissionIds: Array.from(this.selectedPermissions()),
    };
    const req$ = this.roleId
      ? this.rolesService.update(this.roleId, data)
      : this.rolesService.create(data);

    req$.subscribe({
      next: () => {
        this.toastService.success(`Rol ${this.roleId ? 'actualizado' : 'creado'} correctamente`);
        this.saved.emit();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Error al guardar el rol');
        this.isSubmitting.set(false);
      },
    });
  }

  resetForm() {
    this.roleForm.reset();
    this.selectedPermissions.set(new Set<string>());
    this.isLoading.set(false);
  }

  hasUnsavedChanges(): boolean {
    return this.roleForm.dirty || (this.selectedPermissions().size > 0 && !this.roleId);
  }
}
