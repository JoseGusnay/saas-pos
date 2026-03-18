import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/layout/atoms/icon/icon.component';
import { BadgeComponent } from '../../../../core/layout/atoms/badge/badge.component';
import { CustomSelectComponent, SelectOption } from '../../ui/custom-select/custom-select.component';

@Component({
    selector: 'app-list-toolbar',
    standalone: true,
    imports: [CommonModule, FormsModule, IconComponent, BadgeComponent, CustomSelectComponent],
    template: `
    <div class="list-toolbar">
      
      <div class="list-toolbar__search">
        <app-icon name="lucideSearch" class="list-toolbar__search-icon"></app-icon>
        <input 
          type="text" 
          [placeholder]="searchPlaceholder" 
          class="list-toolbar__search-input"
          [ngModel]="searchQuery"
          (ngModelChange)="onSearchChange($event)"
        >
      </div>

      <div class="list-toolbar__actions">
        <div class="list-toolbar__filter-actions">
          <button 
            class="btn btn-ghost btn-sm list-toolbar__filter-btn" 
            [class.is-active]="activeFiltersCount > 0"
            (click)="openFilters.emit()"
          >
            <app-icon name="lucideFilter"></app-icon>
            {{ filtersText }}
            @if (activeFiltersCount > 0) {
              <app-badge [text]="activeFiltersCount.toString()" variant="primary"></app-badge>
            }
          </button>

          @if (activeFiltersCount > 0) {
            <button class="btn btn-ghost btn-sm btn-danger-text list-toolbar__clear-btn" (click)="clearFilters.emit()">
              {{ clearFiltersText }}
            </button>
          }
        </div>

        <div class="list-toolbar__sort">
          <app-custom-select
            [options]="sortOptions"
            [value]="selectedSort"
            (valueChange)="onSortChange($event)"
          ></app-custom-select>
        </div>

        @if (showViewToggle) {
          <div class="list-toolbar__view-toggle">
            <button 
              class="list-toolbar__segmented-btn" 
              [class.list-toolbar__segmented-btn--active]="viewMode === 'grid'"
              (click)="viewModeChange.emit('grid')"
            >
              <app-icon name="lucideGrid"></app-icon>
            </button>
            <button 
              class="list-toolbar__segmented-btn"
              [class.list-toolbar__segmented-btn--active]="viewMode === 'list'"
              (click)="viewModeChange.emit('list')"
            >
              <app-icon name="lucideList"></app-icon>
            </button>
          </div>
        }
      </div>
    </div>
  `,
    styleUrls: ['./list-toolbar.component.scss']
})
export class ListToolbarComponent {
    @Input() searchPlaceholder: string = 'Buscar...';
    @Input() searchQuery: string = '';
    @Input() activeFiltersCount: number = 0;
    @Input() filtersText: string = 'Filtros Avanzados';
    @Input() clearFiltersText: string = 'Limpiar Todo';
    @Input() viewMode: 'grid' | 'list' = 'grid';
    @Input() showViewToggle: boolean = true;
    @Input() selectedSort: string = 'createdAt:desc';
    @Input() sortOptions: SelectOption[] = [
        { label: 'Más Recientes', value: 'createdAt:desc' },
        { label: 'Más Antiguos', value: 'createdAt:asc' },
        { label: 'Nombre (A-Z)', value: 'name:asc' },
        { label: 'Nombre (Z-A)', value: 'name:desc' },
        { label: 'Ingresos (Mayor a Menor)', value: 'revenue:desc' },
        { label: 'Ingresos (Menor a Mayor)', value: 'revenue:asc' }
    ];

    @Output() searchChange = new EventEmitter<string>();
    @Output() openFilters = new EventEmitter<void>();
    @Output() clearFilters = new EventEmitter<void>();
    @Output() viewModeChange = new EventEmitter<'grid' | 'list'>();
    @Output() sortChange = new EventEmitter<{ field: string, order: 'asc' | 'desc' }>();

    onSearchChange(value: string) {
        this.searchChange.emit(value);
    }

    onSortChange(value: string) {
        const [field, order] = value.split(':');
        this.sortChange.emit({ field, order: order as 'asc' | 'desc' });
    }
}
