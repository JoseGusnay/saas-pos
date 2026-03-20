import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueryNodeComponent } from '../../../../../../core/components/query-node/query-node.component';
import { FilterNode, FilterGroup, FilterField } from '../../../../../../core/models/query-builder.models';
import { ModalService } from '../../../../../../core/components/modal/modal.service';

@Component({
  selector: 'app-taxes-advanced-filters',
  standalone: true,
  imports: [CommonModule, QueryNodeComponent],
  template: `
    <div class="filters-body">
      <app-query-node
        [node]="filterTree()"
        [availableFields]="availableFields"
        (nodeChange)="onFilterTreeChange($event)"
      ></app-query-node>
    </div>
  `,
  styles: [`
    .filters-body { min-height: 300px; }
  `]
})
export class TaxesAdvancedFilters {
  @Input({ required: true }) filterTree!: () => FilterGroup;
  @Input({ required: true }) availableFields!: FilterField[];
  @Input({ required: true }) onFilterTreeChange!: (newTree: FilterNode) => void;

  modalService = inject(ModalService);
}
