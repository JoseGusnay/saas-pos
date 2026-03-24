import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomSelectComponent, SelectOption } from '../../ui/custom-select/custom-select.component';
import { FieldInputComponent } from '../../ui/field-input/field-input';
import { SegmentedToggleComponent } from '../../ui/segmented-toggle/segmented-toggle';
import { FilterButtonComponent } from '../../ui/filter-button/filter-button';

@Component({
    selector: 'app-list-toolbar',
    standalone: true,
    imports: [CommonModule, FormsModule, CustomSelectComponent, FieldInputComponent, SegmentedToggleComponent, FilterButtonComponent],
    template: `
    <div class="list-toolbar">
      
      <div class="list-toolbar__search">
        <app-field-input
          prefixIcon="lucideSearch"
          [placeholder]="searchPlaceholder"
          size="sm"
          [ngModel]="searchQuery"
          (ngModelChange)="onSearchChange($event)"
        ></app-field-input>
      </div>

      <div class="list-toolbar__actions">
        <app-filter-button
          [label]="filtersText"
          [clearLabel]="clearFiltersText"
          [activeCount]="activeFiltersCount"
          (openFilters)="openFilters.emit()"
          (clearFilters)="clearFilters.emit()"
        ></app-filter-button>

        <div class="list-toolbar__sort">
          <app-custom-select
            [options]="sortOptions"
            [value]="selectedSort"
            size="sm"
            (valueChange)="onSortChange($event)"
          ></app-custom-select>
        </div>

        @if (showViewToggle) {
          <app-segmented-toggle
            [options]="viewToggleOptions"
            [value]="viewMode"
            (valueChange)="viewModeChange.emit($event === 'grid' ? 'grid' : 'list')"
          />
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

    viewToggleOptions = [
        { value: 'grid', icon: 'lucideGrid', label: 'Vista cuadrícula' },
        { value: 'list', icon: 'lucideList', label: 'Vista lista' },
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
