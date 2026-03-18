import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueryNodeComponent } from '../../../../core/components/query-node/query-node.component';
import { FilterNode, FilterGroup, FilterField } from '../../../../core/models/query-builder.models';
import { ModalService } from '../../../../core/components/modal/modal.service';

@Component({
  selector: 'app-categories-advanced-filters',
  standalone: true,
  imports: [CommonModule, QueryNodeComponent],
  template: `
    <div class="categories-page__query-body">
      <div class="filters-body">
        <app-query-node
          [node]="filterTree()"
          [availableFields]="availableFields"
          (nodeChange)="onFilterTreeChange($event)"
        ></app-query-node>
      </div>
    </div>
  `,
  styles: [`
    .categories-page__query-body {
      /* No internal padding needed as modal-dialog__content already provides it */
    }
    .filters-body {
      min-height: 300px;
    }
  `]
})
export class CategoriesAdvancedFilters {
  @Input({ required: true }) filterTree!: () => FilterGroup;
  @Input({ required: true }) availableFields!: FilterField[];
  @Input({ required: true }) onFilterTreeChange!: (newTree: FilterNode) => void;

  modalService = inject(ModalService);
}
