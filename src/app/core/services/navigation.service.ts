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

    { type: 'section', label: 'Ventas' },
    {
      type: 'item',
      label: 'Historial de Ventas',
      icon: 'lucideReceipt',
      route: '/ventas'
    },
    {
      type: 'item',
      label: 'Clientes',
      icon: 'lucideUsers',
      route: '/clientes'
    },

    { type: 'section', label: 'Inventario' },
    {
      type: 'group',
      label: 'Catálogo',
      icon: 'lucidePackage',
      children: [
        { label: 'Productos',      route: '/inventario/productos',      icon: 'lucideBox' },
        { label: 'Categorías',     route: '/inventario/categorias',     icon: 'lucideLayers' },
        { label: 'Marcas',         route: '/inventario/marcas',         icon: 'lucideTag' },
        { label: 'Unidades',       route: '/inventario/unidades',       icon: 'lucideRuler' },
        { label: 'Atributos',     route: '/inventario/atributos',      icon: 'lucideTags' },
        { label: 'Bodegas',        route: '/inventario/bodegas',        icon: 'lucideWarehouse' },
        { label: 'Stock',          route: '/inventario/stock',          icon: 'lucideBarChart2' },
        { label: 'Lotes',          route: '/inventario/lotes',          icon: 'lucideFlaskConical' },
      ]
    },
    {
      type: 'group',
      label: 'Compras',
      icon: 'lucideShoppingCart',
      children: [
        { label: 'Proveedores',       route: '/inventario/proveedores',    icon: 'lucideBuilding2' },
        { label: 'Órdenes de Compra', route: '/inventario/ordenes-compra', icon: 'lucideClipboardList' },
      ]
    },

    { type: 'section', label: 'Reportes' },
    {
      type: 'group',
      label: 'Reportes',
      icon: 'lucideBarChart2',
      children: [
        { label: 'Ventas Anuales', route: '/reports/sales',       icon: 'lucideTrendingUp' },
        { label: 'Rendimiento',    route: '/reports/performance', icon: 'lucideActivity' },
        { label: 'Impuestos',      route: '/reports/taxes',       icon: 'lucideFileText' },
      ]
    },

    { type: 'section', label: 'Configuración' },
    {
      type: 'group',
      label: 'Configuración',
      icon: 'lucideSettings',
      children: [
        { label: 'Empresa Fiscal',  route: '/configuracion/empresa-fiscal', icon: 'lucideBuilding2' },
        { label: 'Sucursales',      route: '/configuracion/sucursales',     icon: 'lucideMapPin' },
        { label: 'Impuestos',       route: '/configuracion/impuestos',      icon: 'lucidePercent' },
        { label: 'Usuarios',        route: '/configuracion/usuarios',       icon: 'lucideUsers' },
        { label: 'Roles y Permisos',route: '/configuracion/usuarios/roles', icon: 'lucideShield' },
      ]
    },
  ]);

  readonly sidebarMenu = this.menu.asReadonly();

  constructor() {}
}
