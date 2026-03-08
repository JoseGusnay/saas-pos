import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';
import { ModalService } from '../../../../core/components/modal/modal.service';
import { BranchesAdvancedFilters } from './components/branches-advanced-filters/branches-advanced-filters';
import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';

@Component({
  selector: 'app-branches-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ListToolbarComponent, PaginationComponent, DataCardComponent],
  template: `
    <div class="branches-page">
      <app-page-header
        title="Sucursales"
        [tabs]="branchTabs"
        [activeTab]="activeTab()"
        ctaText="Añadir Sucursal"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddBranch()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar sucursal..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
        (searchChange)="onSearch($event)"
        (openFilters)="openAdvancedFilters()"
        (clearFilters)="clearAllFilters()"
        (viewModeChange)="viewModePreference.set($event)"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'branches-page__grid' : 'branches-page__list'">
        @for (branch of paginatedBranches(); track branch.id) {
          <app-data-card
            [title]="branch.name"
            [status]="branch.status"
            [statusConfig]="branch.status === 'Operativa' ? 'active' : (branch.status === 'Cerrada' ? 'inactive' : 'warning')"
            [details]="[
              { icon: 'lucideMapPin', text: branch.address },
              { icon: 'lucidePhone', text: branch.phone },
              { icon: 'lucideUser', text: branch.manager }
            ]"
            [metric]="{ label: 'Ingresos Hoy', value: branch.revenue }"
            [avatars]="[
              { url: 'https://ui-avatars.com/api/?name=C+D&background=random', name: 'User 1' },
              { url: 'https://ui-avatars.com/api/?name=A+B&background=random', name: 'User 2' }
            ]"
          ></app-data-card>
        }
      </div>

      <app-pagination
        [totalItems]="totalItems()"
        [pageSize]="pageSize()"
        [currentPage]="currentPage()"
        (pageChange)="currentPage.set($event)"
      ></app-pagination>
    </div>
  `,
  styleUrl: './branches-list.component.scss'
})
export class BranchesListComponent {
  // 1. Estado Reactivo (Mock Data Extendida para probar Paginación)
  private readonly branchesData = signal([
    { id: 1, name: 'Sede Central - Manhattan', status: 'Operativa', address: '120 Broadway, piso 23', phone: '+1 212-555-0192', manager: 'Sarah Connor', revenue: '$14,520' },
    { id: 2, name: 'Sucursal Brooklyn', status: 'Operativa', address: '450 Flatbush Ave', phone: '+1 718-555-0100', manager: 'John Smith', revenue: '$8,210' },
    { id: 3, name: 'Bodega Queens', status: 'Cerrada', address: '12-34 Queens Blvd', phone: '+1 718-555-0199', manager: 'Alicia Keys', revenue: '$0' },
    { id: 4, name: 'Sucursal Soho', status: 'Operativa', address: '89 Spring St', phone: '+1 212-555-0222', manager: 'Marcus O.', revenue: '$11,400' },
    { id: 5, name: 'Oficina Central LA', status: 'Operativa', address: '1200 Wilshire Blvd', phone: '+1 213-555-0909', manager: 'Elena Vance', revenue: '$9,200' },
    { id: 6, name: 'Kiosko Santa Monica', status: 'Operativa', address: 'Plaza del Sol 400', phone: '+1 310-555-5544', manager: 'David Kim', revenue: '$3,800' },
    { id: 7, name: 'Almacén Chicago', status: 'Operativa', address: 'La Salle 333', phone: '+1 312-555-0012', manager: 'Robert T.', revenue: '$22,100' },
    { id: 8, name: 'Sucursal Miami', status: 'En Mantenimiento', address: 'Ocean Drive 45', phone: '+1 305-555-7788', manager: 'Carlos D.', revenue: '$0' },
    { id: 9, name: 'Sucursal Seattle', status: 'Operativa', address: 'Pike Place 110', phone: '+1 206-555-4567', manager: 'Jenny R.', revenue: '$15,600' },
    { id: 10, name: 'Bodega Austin', status: 'Operativa', address: '6th Street 800', phone: '+1 512-555-1234', manager: 'Tommy L.', revenue: '$6,400' },
    { id: 11, name: 'Oficina Denver', status: 'Cerrada', address: 'Colfax Ave 900', phone: '+1 303-555-9876', manager: 'Sam W.', revenue: '$0' },
    { id: 12, name: 'Pop-up San Francisco', status: 'Operativa', address: 'Market St 10', phone: '+1 415-555-3456', manager: 'Lisa M.', revenue: '$4,100' },
  ]);

  modalService = inject(ModalService);

  openAdvancedFilters() {
    this.modalService.open(
      BranchesAdvancedFilters,
      'Filtros Avanzados',
      {
        filterTree: this.filterTree, // signal binding function read reference
        availableFields: this.availableFields,
        onFilterTreeChange: this.onFilterTreeChange.bind(this)
      },
      'Los filtros se aplican en tiempo real',
      [
        {
          label: 'Hecho',
          variant: 'primary',
          action: () => this.modalService.close()
        }
      ]
    );
  }

  // 2. Signals Mutables y Reactivos para UI State
  searchQuery = signal('');

  // Preferencia del usuario
  viewModePreference = signal<'grid' | 'list'>('grid');

  // Detección Responsive de Mobile Strict
  isMobile = signal<boolean>(false);

  // ViewMode final: Obliga Grid en Celulares, respeta preferencia en Tablets+
  viewMode = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());

  branchTabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Operativas', value: 'Operativas' },
    { label: 'Críticas (Ingreso $0)', value: 'Criticas' },
  ];

  onTabChange(tab: string) {
    this.activeTab.set(tab as 'Todas' | 'Operativas' | 'Criticas');
    this.resetPagination();
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.resetPagination();
  }

  onAddBranch() {
    // Action for adding branch
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mobileQuery.matches);
      mobileQuery.addEventListener('change', (e) => this.isMobile.set(e.matches));
    }
  }
  activeTab = signal<'Todas' | 'Operativas' | 'Criticas'>('Todas');

  // Array de campos configurables para inyectar en el Query Builder
  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre de Sucursal', type: 'text' },
    { id: 'status', label: 'Estado Operativo', type: 'select' },
    { id: 'revenue', label: 'Ingresos', type: 'number' }
  ];

  // El Árbol Lógico Inicial (Raíz Genuinamente Recursiva)
  filterTree = signal<FilterGroup>({
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: []
  });

  // Handler del Root
  onFilterTreeChange(newTree: FilterNode) {
    if (newTree.type === 'group') {
      this.filterTree.set(newTree as FilterGroup);
    }
  }

  // Clear function
  clearAllFilters() {
    this.filterTree.set({
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: []
    });
    this.resetPagination();
  }

  // Counter
  activeFiltersCount = computed(() => {
    const tree = this.filterTree();

    const countLeaves = (node: FilterNode): number => {
      if (node.type === 'group') {
        return node.children.reduce((acc, child) => acc + countLeaves(child), 0);
      } else {
        const rule = node as FilterRule;
        // Cuenta solo si tiene un valor ingresado y no es un esqueleto vacío
        return rule.value && rule.value.trim() !== '' ? 1 : 0;
      }
    };

    return countLeaves(tree);
  });

  // ========== ESTADO DE PAGINACIÓN ==========
  currentPage = signal(1);
  pageSize = signal(10); // 10 cards por página simulando Vercel

  // Al cambiar filtros o tab, mandar la paginación de vuelta a 1
  resetPagination = () => this.currentPage.set(1);

  // Computed signals para los labels "1-10 of 42"
  totalItems = computed(() => this.filteredBranches().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  // Cortar el array grande para dar de comer al Loop de Angular
  paginatedBranches = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredBranches().slice(start, end);
  });

  // Funcionales de Paginación
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  // 3. Computed signal evaluador INFINITO N-Depth
  filteredBranches = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tree = this.filterTree();
    const tab = this.activeTab();
    let result = this.branchesData();

    // Tab Evaluation (Pre-filter)
    if (tab === 'Operativas') {
      result = result.filter(branch => branch.status === 'Operativa');
    } else if (tab === 'Criticas') {
      result = result.filter(branch => branch.revenue === '$0');
    }

    // Text Box Evaluation
    if (query) {
      result = result.filter(branch =>
        branch.name.toLowerCase().includes(query) ||
        branch.address.toLowerCase().includes(query)
      );
    }

    // Evaluador Matemático Recursivo Interno
    const evaluateNode = (node: FilterNode, objectToFilter: any): boolean => {
      if (node.type === 'group') {
        if (node.children.length === 0) return true; // Grupos vacíos no filtran

        const evaluations = node.children.map(child => evaluateNode(child, objectToFilter));
        return node.logicalOperator === 'AND'
          ? evaluations.every(Boolean)
          : evaluations.some(Boolean);
      } else {
        // Regla Pura (Leaf)
        if (!node.value) return true;

        let bVal: any = objectToFilter[node.field as keyof typeof objectToFilter];
        let fVal: any = node.value;

        // Castings para matemáticas
        if (node.field === 'revenue' && typeof bVal === 'string') {
          bVal = Number(bVal.replace(/[^0-9.-]+/g, ""));
          fVal = Number(fVal) || 0;
        } else if (typeof bVal === 'string' && typeof fVal === 'string') {
          bVal = bVal.toLowerCase();
          fVal = fVal.toLowerCase();
        }

        switch (node.operator) {
          case 'equals': return bVal === fVal;
          case 'contains': return String(bVal).includes(String(fVal));
          case 'greaterThan': return bVal > fVal;
          case 'lessThan': return bVal < fVal;
          default: return true;
        }
      }
    };

    // Aplicar Filtro Base
    if (tree.children.length > 0) {
      result = result.filter(branch => evaluateNode(tree, branch));
    }

    return result;
  });
}
