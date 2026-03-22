import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucidePencil, lucideTrash2, lucideSearch,
  lucideRuler, lucideHash, lucideLayers
} from '@ng-icons/lucide';

import { UnitsService } from '../../../../core/services/units.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Unit, UnitType, UNIT_TYPE_LABELS } from '../../../../core/models/unit.models';
import { UnitDrawerComponent } from '../../components/unit-drawer/unit-drawer.component';

@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, SkeletonComponent, EmptyStateComponent,
    ModalComponent, FormButtonComponent, ActionsMenuComponent,
    UnitDrawerComponent,
  ],
  providers: [
    provideIcons({ lucidePlus, lucidePencil, lucideTrash2, lucideSearch, lucideRuler, lucideHash, lucideLayers })
  ],
  template: `
    <div class="units-page">
      <app-page-header
        title="Unidades de Medida"
        [tabs]="tabs"
        [activeTab]="activeTab()"
        ctaText="Nueva Unidad"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAdd()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar unidades..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="0"
        [viewMode]="viewMode()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewMode.set($event)"
        (sortChange)="onSortChange($event)"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'units-page__grid' : 'units-page__list'">

        @if (isLoading()) {
          @for (n of [1,2,3,4,5,6]; track n) {
            @if (viewMode() === 'grid') {
              <div class="data-card skeleton-card">
                <header class="data-card__header sk-header">
                  <div class="data-card__title-container sk-title-container">
                    <app-skeleton width="140px" height="1rem"></app-skeleton>
                    <app-skeleton width="56px" height="18px" radius="999px"></app-skeleton>
                  </div>
                  <app-skeleton width="28px" height="28px" shape="circle"></app-skeleton>
                </header>
                <div class="data-card__body sk-body">
                  <div class="sk-detail">
                    <app-skeleton width="14px" height="14px" radius="3px"></app-skeleton>
                    <app-skeleton width="60px" height="0.8125rem"></app-skeleton>
                  </div>
                  <div class="sk-detail">
                    <app-skeleton width="14px" height="14px" radius="3px"></app-skeleton>
                    <app-skeleton width="90px" height="0.8125rem"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <div class="unit-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="44px" height="44px" radius="10px"></app-skeleton>
                  <div class="unit-info sk-unit-info">
                    <app-skeleton width="140px" height="0.875rem"></app-skeleton>
                    <app-skeleton width="80px" height="0.75rem"></app-skeleton>
                  </div>
                </div>
                <app-skeleton width="64px" height="22px" radius="999px"></app-skeleton>
                <app-skeleton width="28px" height="28px" shape="circle"></app-skeleton>
              </div>
            }
          }
        } @else if (units().length > 0) {
          @for (unit of units(); track unit.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="unit.name"
                [status]="unit.isActive ? 'Activa' : 'Inactiva'"
                [statusConfig]="unit.isActive ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideHash', text: unit.abbreviation },
                  { icon: 'lucideLayers', text: typeLabel(unit.type) }
                ]"
                [actions]="unitActions"
                (actionClick)="handleAction($event, unit)"
              ></app-data-card>
            } @else {
              <div class="unit-row-item shadow-sm">
                <div class="row-main">
                  <div class="unit-avatar">
                    <span>{{ unit.abbreviation }}</span>
                  </div>
                  <div class="unit-info">
                    <span class="unit-name">{{ unit.name }}</span>
                    <span class="unit-sub">{{ typeLabel(unit.type) }}</span>
                  </div>
                </div>
                <span [class]="'badge-status ' + (unit.isActive ? 'active' : 'inactive')">
                  {{ unit.isActive ? 'Activa' : 'Inactiva' }}
                </span>
                <div (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="unitActions"
                    (actionClick)="handleAction($event, unit)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="units-page__empty">
            <app-empty-state
              [icon]="searchQuery() ? 'lucideSearch' : 'lucideRuler'"
              [title]="searchQuery() ? 'No encontramos lo que buscas' : 'No hay unidades registradas'"
              [description]="searchQuery() ? 'Intenta con otros términos.' : 'Crea la primera unidad de medida.'"
              [actionLabel]="searchQuery() ? 'Limpiar búsqueda' : 'Nueva Unidad'"
              (action)="searchQuery() ? clearSearch() : onAdd()"
            ></app-empty-state>
          </div>
        }
      </div>

      <app-pagination
        [totalItems]="totalItems()"
        [pageSize]="pageSize()"
        [currentPage]="currentPage()"
        (pageChange)="currentPage.set($event)"
      ></app-pagination>

      <app-unit-drawer
        [isOpen]="drawerOpen()"
        [unit]="drawerUnit() ?? undefined"
        (saved)="onSaved($event)"
        (close)="drawerOpen.set(false)"
      ></app-unit-drawer>

      <app-modal [isOpen]="deleteModalOpen()" title="Confirmar Eliminación" (close)="deleteModalOpen.set(false)">
        <div modalBody>
          ¿Estás seguro de eliminar la unidad "<strong>{{ unitToDelete()?.name }}</strong>"?
          Esta acción no se puede deshacer.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="deleteModalOpen.set(false)"></app-form-button>
          <app-form-button
            label="Eliminar"
            variant="danger"
            icon="lucideTrash2"
            [loading]="isDeleting()"
            [disabled]="isDeleting()"
            (click)="confirmDelete()"
          ></app-form-button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .units-page { display: flex; flex-direction: column; min-height: 100%; width: 100%; }
    .units-page__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
    .units-page__list { display: flex; flex-direction: column; gap: 0.75rem; }
    .units-page__empty { grid-column: 1 / -1; display: flex; justify-content: center; width: 100%; padding: 4rem 1rem; }

    .skeleton-card { pointer-events: none; background: var(--color-bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light); padding: 20px; }
    .skeleton-row { pointer-events: none; }

    .sk-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .sk-title-container { display: flex; flex-direction: column; gap: 6px; }
    .sk-body { display: flex; flex-direction: column; gap: 10px; }
    .sk-detail { display: flex; align-items: center; gap: 8px; }
    .sk-unit-info { display: flex; flex-direction: column; gap: 5px; }

    .unit-row-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.5rem; background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-lg);
      cursor: default; transition: all var(--transition-base);
    }
    .unit-row-item:hover { border-color: var(--color-accent-primary); background: var(--color-bg-hover); }

    .row-main { display: flex; align-items: center; gap: 1rem; }
    .unit-avatar {
      width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-weight: var(--font-weight-bold); font-size: var(--font-size-sm);
      background: var(--color-primary-subtle); color: var(--color-accent-primary);
      letter-spacing: 0.02em;
    }
    .unit-info { display: flex; flex-direction: column; gap: 5px; }
    .unit-name { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }
    .unit-sub { font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .badge-status { padding: 0.25rem 0.75rem; border-radius: 99px; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
    .badge-status.active { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-status.inactive { background: var(--color-border-subtle); color: var(--color-text-muted); }

    .data-card__header { display: flex; justify-content: space-between; align-items: flex-start; }
    .data-card__title-container { display: flex; flex-direction: column; gap: 0.25rem; }
    .modal-footer-actions { display: flex; gap: 1rem; justify-content: flex-end; }
  `]
})
export class UnitsListComponent {
  private unitsSvc = inject(UnitsService);
  private toastSvc = inject(ToastService);

  readonly unitActions: ActionItem[] = [
    { id: 'edit',   label: 'Editar',   icon: 'lucidePencil' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' },
  ];

  readonly tabs = [
    { label: 'Todas',    value: 'Todas'    },
    { label: 'Activas',  value: 'Activas'  },
    { label: 'Inactivas',value: 'Inactivas'},
  ];

  activeTab    = signal('Todas');
  searchQuery  = signal('');
  viewMode     = signal<'grid' | 'list'>('grid');
  currentPage  = signal(1);
  pageSize     = signal(12);
  sortField    = signal('name');
  sortOrder    = signal<'ASC' | 'DESC'>('ASC');
  refreshTrigger = signal(0);

  drawerOpen   = signal(false);
  drawerUnit   = signal<Unit | null>(null);
  deleteModalOpen = signal(false);
  unitToDelete = signal<Unit | null>(null);
  isDeleting   = signal(false);
  isLoading    = signal(true);

  private readonly response = toSignal(
    toObservable(computed(() => ({
      page:       this.currentPage(),
      limit:      this.pageSize(),
      search:     this.searchQuery(),
      sortField:  this.sortField(),
      sortOrder:  this.sortOrder(),
      tab:        this.activeTab(),
      refresh:    this.refreshTrigger(),
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const filters: any = {
          page:      params.page,
          limit:     params.limit,
          search:    params.search,
          sortField: params.sortField,
          sortOrder: params.sortOrder,
        };
        if (params.tab === 'Activas')   filters.onlyActive = true;
        if (params.tab === 'Inactivas') filters.filterModel = { isActive: { filterType: 'boolean', filter: false } };
        return this.unitsSvc.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  units      = computed(() => this.response()?.data  ?? []);
  totalItems = computed(() => this.response()?.total ?? 0);

  typeLabel(type: UnitType): string { return UNIT_TYPE_LABELS[type] ?? type; }

  onTabChange(tab: string) { this.activeTab.set(tab); this.currentPage.set(1); }
  onSearch(q: string)      { this.searchQuery.set(q); this.currentPage.set(1); }
  onSortChange(ev: any)    { this.sortField.set(ev.field); this.sortOrder.set(ev.order.toUpperCase()); this.currentPage.set(1); }
  clearSearch()            { this.searchQuery.set(''); }

  onAdd()           { this.drawerUnit.set(null);  this.drawerOpen.set(true); }
  onEdit(unit: Unit){ this.drawerUnit.set(unit);  this.drawerOpen.set(true); }

  onSaved(_unit: Unit) {
    this.drawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
  }

  handleAction(action: ActionItem, unit: Unit) {
    if (action.id === 'edit')   this.onEdit(unit);
    if (action.id === 'delete') { this.unitToDelete.set(unit); this.deleteModalOpen.set(true); }
  }

  confirmDelete() {
    const u = this.unitToDelete(); if (!u) return;
    this.isDeleting.set(true);
    this.unitsSvc.remove(u.id).subscribe({
      next: () => {
        this.toastSvc.success('Unidad eliminada correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.deleteModalOpen.set(false);
      },
      error: () => { this.toastSvc.error('Error al eliminar la unidad'); this.isDeleting.set(false); }
    });
  }
}
