import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/layout/atoms/icon/icon.component';
import { BadgeComponent } from '../../../../core/layout/atoms/badge/badge.component';

@Component({
    selector: 'app-list-toolbar',
    standalone: true,
    imports: [CommonModule, FormsModule, IconComponent, BadgeComponent],
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
            class="list-toolbar__ghost-btn" 
            [class.list-toolbar__ghost-btn--active]="activeFiltersCount > 0"
            (click)="openFilters.emit()"
          >
            <app-icon name="lucideFilter"></app-icon>
            {{ filtersText }}
            @if (activeFiltersCount > 0) {
              <app-badge [text]="activeFiltersCount.toString()" variant="primary"></app-badge>
            }
          </button>

          @if (activeFiltersCount > 0) {
            <button class="list-toolbar__ghost-btn list-toolbar__ghost-btn--danger" (click)="clearFilters.emit()">
              {{ clearFiltersText }}
            </button>
          }
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

    @Output() searchChange = new EventEmitter<string>();
    @Output() openFilters = new EventEmitter<void>();
    @Output() clearFilters = new EventEmitter<void>();
    @Output() viewModeChange = new EventEmitter<'grid' | 'list'>();

    onSearchChange(value: string) {
        this.searchChange.emit(value);
    }
}
