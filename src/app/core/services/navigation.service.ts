import { Injectable, signal } from '@angular/core';

export interface NavItem {
  type: 'item';
  label: string;
  icon: string;
  route: string;
  badge?: string;
  badgeVariant?: 'primary' | 'success' | 'danger' | 'warning' | 'info';
  exactMatch?: boolean;
}

export interface NavSection {
  type: 'section';
  label: string;
}

export interface NavGroup {
  type: 'group';
  label: string;
  icon: string;
  children: { label: string; route: string; icon: string }[];
}

export type SidebarItem = NavItem | NavSection | NavGroup;

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  
  private readonly menu = signal<SidebarItem[]>([
    { 
      type: 'item',
      label: 'Dashboard', 
      icon: 'lucideLayoutDashboard', 
      route: '/dashboard', 
      exactMatch: true 
    },
    { 
      type: 'item',
      label: 'Sucursales', 
      icon: 'lucideMapPin', 
      route: '/sucursales' 
    },
    
    { type: 'section', label: 'Operaciones' },
    { 
      type: 'item',
      label: 'Punto de Venta', 
      icon: 'lucideTerminal', 
      route: '/pos', 
      badge: 'Hot', 
      badgeVariant: 'success' 
    },
    { 
      type: 'item',
      label: 'Caja Registradora', 
      icon: 'lucideBanknote', 
      route: '/cash-register' 
    },
    
    {
      type: 'group',
      label: 'Inventario',
      icon: 'lucidePackage',
      children: [
        { label: 'Categorías', route: '/inventario/categorias', icon: 'lucideLayers' },
        { label: 'Marcas', route: '/inventario/marcas', icon: 'lucideTag' },
        { label: 'Productos', route: '/inventario/productos', icon: 'lucideBox' }
      ]
    },

    {
      type: 'group',
      label: 'Usuarios y Seguridad',
      icon: 'lucideShieldCheck',
      children: [
        { label: 'Listado de Usuarios', route: '/usuarios', icon: 'lucideUsers' },
        { label: 'Roles y Permisos', route: '/usuarios/roles', icon: 'lucideShield' }
      ]
    },

    { type: 'section', label: 'Reportes y Ajustes' },
    {
      type: 'group',
      label: 'Reportes',
      icon: 'lucideBarChart2',
      children: [
        { label: 'Ventas Anuales', route: '/reports/sales', icon: 'lucideTrendingUp' },
        { label: 'Rendimiento', route: '/reports/performance', icon: 'lucideActivity' },
        { label: 'Impuestos', route: '/reports/taxes', icon: 'lucideFileText' }
      ]
    },
    { 
      type: 'item',
      label: 'Configuración', 
      icon: 'lucideSettings', 
      route: '/settings' 
    }
  ]);

  readonly sidebarMenu = this.menu.asReadonly();

  constructor() {}
}
