import { Component, ChangeDetectionStrategy, computed, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, map, switchMap, debounceTime, tap } from 'rxjs';

import { LotService } from '../../../../core/services/lot.service';
import { ProductService } from '../../services/product.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Lot } from '../../../../core/models/stock.models';
import { QueryNodeComponent } from '../../../../core/components/query-node/query-node.component';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { DatePickerComponent } from '../../../../shared/components/ui/date-picker/date-picker';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideFlaskConical, lucideCalendar, lucideAlertTriangle, lucideCheckCircle2,
  lucidePencil, lucidePlus, lucidePackage, lucideDollarSign, lucideInbox,
  lucideHash, lucideInfo,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-lots-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent, DataCardComponent,
    DrawerComponent, FormButtonComponent, SkeletonComponent, EmptyStateComponent,
    ActionsMenuComponent, SearchSelectComponent, DatePickerComponent, NgIconComponent,
    QueryNodeComponent,
  ],
  providers: [provideIcons({
    lucideFlaskConical, lucideCalendar, lucideAlertTriangle, lucideCheckCircle2,
    lucidePencil, lucidePlus, lucidePackage, lucideDollarSign, lucideInbox, lucideHash, lucideInfo
  })],
  templateUrl: './lots-list.component.html',
  styleUrl: './lots-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LotsListComponent {
  private lotService = inject(LotService);
  private productService = inject(ProductService);
  private toastService = inject(ToastService);

  lotTabs = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Próximos a vencer', value: 'Próximos a vencer' }
  ];

  sortOptions = [
    { label: 'Más recientes', value: 'createdAt:DESC' },
    { label: 'Más antiguos', value: 'createdAt:ASC' },
    { label: 'Lote A-Z', value: 'lotNumber:ASC' },
    { label: 'Lote Z-A', value: 'lotNumber:DESC' },
  ];

  lotActions: ActionItem[] = [
    { id: 'edit', label: 'Editar Notas', icon: 'lucidePencil' }
  ];

  // ─── State ──────────────────────────────────────────────────────────────

  activeTab          = signal('Todos');
  searchQuery        = signal('');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile           = signal(false);
  viewMode           = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  sortField          = signal('createdAt');
  sortOrder          = signal<'ASC' | 'DESC'>('DESC');
  currentPage        = signal(1);
  pageSize           = signal(12);
  refreshTrigger     = signal(0);
  isLoading          = signal(true);

  skeletonArray = computed(() => Array.from({ length: Math.min(this.pageSize(), this.viewMode() === 'grid' ? 6 : 8) }, (_, i) => i + 1));

  // Detail
  isDetailOpen  = signal(false);
  detailTarget  = signal<Lot | null>(null);

  // Filters
  isFiltersOpen = signal(false);
  readonly filterConfig: FilterField[] = [
    { id: 'lot_number', label: 'N° de Lote', type: 'text' },
    { id: 'cost_price', label: 'Precio de Costo', type: 'number' },
    { id: 'expiry_date', label: 'Fecha de Vencimiento', type: 'date' },
    { id: 'created_at', label: 'Fecha de Creación', type: 'date' },
  ];
  private readonly emptyFilter: FilterGroup = { type: 'group', id: 'root', logicalOperator: 'AND', children: [] };
  appliedFilterTree = signal<FilterGroup>({ ...this.emptyFilter });
  filterTreeDraft   = signal<FilterGroup>({ ...this.emptyFilter });

  activeFiltersCount = computed(() => {
    const count = (node: FilterNode): number => {
      if (node.type === 'group') return (node as FilterGroup).children.reduce((a, c) => a + count(c), 0);
      const rule = node as FilterRule;
      if (['blank', 'notBlank'].includes(rule.operator)) return 1;
      return rule.value ? 1 : 0;
    };
    return count(this.appliedFilterTree());
  });

  // Edit
  isEditOpen   = signal(false);
  isEditing    = signal(false);
  editTarget   = signal<Lot | null>(null);
  editNotes    = '';

  isCreateOpen = signal(false);
  isCreating   = signal(false);
  createVariantId  = '';
  createLotNumber  = '';
  createExpiryDate = '';
  createCostPrice: number | null = null;
  createNotes      = '';

  // ─── Reactive stream ────────────────────────────────────────────────────

  private readonly lotsResponse = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
      expiringSoon: this.activeTab() === 'Próximos a vencer',
      filterModel: QueryMapper.toAgGridFilterModel(this.appliedFilterTree(), this.filterConfig),
      refresh: this.refreshTrigger()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { refresh, sortField, sortOrder, filterModel, ...filters } = params;
        const fm = Object.keys(filterModel).length > 0 ? filterModel : undefined;
        return this.lotService.findAll({ ...filters, ...(sortField ? { sortField, sortOrder } as any : {}), ...(fm ? { filterModel: fm } as any : {}) }).pipe(
          tap(() => this.isLoading.set(false))
        );
      })
    )
  );

  lots       = computed(() => (this.lotsResponse() as any)?.data  ?? []);
  totalItems = computed(() => (this.lotsResponse() as any)?.total ?? 0);

  // ─── Helpers ────────────────────────────────────────────────────────────

  getLotStatus(lot: Lot): string {
    if (!lot.expiryDate) return 'sin-vencimiento';
    const expiry = new Date(lot.expiryDate);
    const now = new Date();
    if (expiry < now) return 'vencido';
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    if (expiry <= thirtyDays) return 'proximo';
    return 'vigente';
  }

  getLotStatusLabel(lot: Lot): string {
    const s = this.getLotStatus(lot);
    if (s === 'vencido') return 'Vencido';
    if (s === 'proximo') return 'Próximo a vencer';
    if (s === 'sin-vencimiento') return 'Sin vencimiento';
    return 'Vigente';
  }

  getLotStatusClass(lot: Lot): string { return this.getLotStatus(lot); }

  getLotStatusConfig(lot: Lot): 'active' | 'inactive' | 'warning' {
    const s = this.getLotStatus(lot);
    if (s === 'vigente') return 'active';
    if (s === 'proximo' || s === 'vencido') return 'warning';
    return 'inactive';
  }

  getLotDetails(lot: Lot): { icon: string; text: string }[] {
    const details: { icon: string; text: string }[] = [
      { icon: 'lucidePackage', text: `${lot.productName ?? ''} — ${lot.variantName ?? ''}` },
    ];
    if (lot.expiryDate) {
      details.push({ icon: 'lucideCalendar', text: `Vence: ${new Date(lot.expiryDate).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}` });
    }
    if (lot.costPrice != null) {
      details.push({ icon: 'lucideDollarSign', text: `Costo: $${Number(lot.costPrice).toFixed(4)}` });
    }
    return details;
  }

  // ─── Events ─────────────────────────────────────────────────────────────

  onTabChange(tab: string) { this.activeTab.set(tab); this.currentPage.set(1); }
  onSearch(q: string) { this.searchQuery.set(q); this.currentPage.set(1); }
  onSortChange(value: { field: string; order: 'asc' | 'desc' }) {
    this.sortField.set(value.field);
    this.sortOrder.set(value.order.toUpperCase() as 'ASC' | 'DESC');
    this.currentPage.set(1);
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.activeTab.set('Todos');
    this.appliedFilterTree.set({ ...this.emptyFilter });
    this.filterTreeDraft.set({ ...this.emptyFilter });
    this.currentPage.set(1);
    this.isFiltersOpen.set(false);
  }

  openFiltersDrawer() {
    this.filterTreeDraft.set(structuredClone(this.appliedFilterTree()));
    this.isFiltersOpen.set(true);
  }

  applyFilters() {
    this.appliedFilterTree.set(this.filterTreeDraft());
    this.currentPage.set(1);
    this.isFiltersOpen.set(false);
  }

  openDetail(lot: Lot) {
    this.detailTarget.set(lot);
    this.isDetailOpen.set(true);
  }

  handleAction(action: ActionItem, lot: Lot) {
    if (action.id === 'edit') this.openEdit(lot);
  }

  // ─── Edit ───────────────────────────────────────────────────────────────

  openEdit(lot: Lot) {
    this.editTarget.set(lot);
    this.editNotes = lot.notes ?? '';
    this.isEditOpen.set(true);
  }

  confirmEdit() {
    const target = this.editTarget();
    if (!target) return;
    this.isEditing.set(true);
    this.lotService.update(target.id, { notes: this.editNotes || undefined }).subscribe({
      next: () => {
        this.toastService.success('Notas actualizadas');
        this.isEditing.set(false);
        this.isEditOpen.set(false);
        this.refreshTrigger.update(v => v + 1);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al actualizar');
        this.isEditing.set(false);
      }
    });
  }

  // ─── Create ─────────────────────────────────────────────────────────────

  variantSearchFn = (query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    return this.productService.searchVariantsAdvanced({ search: query, page, limit: 20 }).pipe(
      map(res => ({
        data: (res.data ?? []).map((v: any) => ({
          value: v.variantId,
          label: `${v.productName}${v.variantName ? ' — ' + v.variantName : ''}`,
          description: v.sku ? `SKU: ${v.sku}` : undefined,
        })),
        hasMore: res.hasMore ?? false
      }))
    );
  };

  onCreateVariantChange(opt: SearchSelectOption | SearchSelectOption[] | null) {
    const s = opt as SearchSelectOption | null;
    this.createVariantId = s?.value ?? '';
  }

  openCreate() {
    this.createVariantId = '';
    this.createLotNumber = '';
    this.createExpiryDate = '';
    this.createCostPrice = null;
    this.createNotes = '';
    this.isCreateOpen.set(true);
  }

  confirmCreate() {
    if (!this.createVariantId || !this.createLotNumber.trim()) return;
    this.isCreating.set(true);
    this.lotService.create({
      variantId: this.createVariantId,
      lotNumber: this.createLotNumber.trim(),
      expiryDate: this.createExpiryDate || undefined,
      costPrice: this.createCostPrice ?? undefined,
      notes: this.createNotes || undefined,
    }).subscribe({
      next: () => {
        this.toastService.success('Lote creado correctamente');
        this.isCreating.set(false);
        this.isCreateOpen.set(false);
        this.refreshTrigger.update(v => v + 1);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al crear el lote');
        this.isCreating.set(false);
      }
    });
  }

  // ─── Constructor ────────────────────────────────────────────────────────

  private destroyRef = inject(DestroyRef);

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      const handler = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
      mq.addEventListener('change', handler);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', handler));
    }
  }
}
