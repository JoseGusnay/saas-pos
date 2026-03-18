import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueryNodeComponent } from '../../../../../../core/components/query-node/query-node.component';
import { FilterNode, FilterGroup, FilterField } from '../../../../../../core/models/query-builder.models';
import { ModalService } from '../../../../../../core/components/modal/modal.service';

@Component({
  selector: 'app-brands-advanced-filters',
  standalone: true,
  imports: [CommonModule, QueryNodeComponent],
  template: `
    <div class="brands-page__query-body">
      <app-query-node
        [node]="filterTree()"
        [availableFields]="availableFields"
        (nodeChange)="onFilterTreeChange($event)"
      ></app-query-node>
    </div>
  `,
  styles: [`
    .brands-page__query-body {
      min-height: 300px;
    }
  `]
})
export class BrandsAdvancedFilters {
  @Input({ required: true }) filterTree!: () => FilterGroup;
  @Input({ required: true }) availableFields!: FilterField[];
  @Input({ required: true }) onFilterTreeChange!: (newTree: FilterNode) => void;

  modalService = inject(ModalService);

  closeModal() {
    this.modalService.close();
  }
}
