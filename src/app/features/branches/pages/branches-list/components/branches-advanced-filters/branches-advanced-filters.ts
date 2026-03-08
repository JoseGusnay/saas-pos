import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueryNodeComponent } from '../../../../../../core/components/query-node/query-node.component';
import { FilterNode, FilterGroup, FilterField } from '../../../../../../core/models/query-builder.models';
import { ModalService } from '../../../../../../core/components/modal/modal.service';

@Component({
  selector: 'app-branches-advanced-filters',
  standalone: true,
  imports: [CommonModule, QueryNodeComponent],
  templateUrl: './branches-advanced-filters.html',
  styleUrl: './branches-advanced-filters.scss',
})
export class BranchesAdvancedFilters {
  // Inputs Dinámicos que recibiremos de NgComponentOutlet
  @Input({ required: true }) filterTree!: () => FilterGroup;
  @Input({ required: true }) availableFields!: FilterField[];
  @Input({ required: true }) onFilterTreeChange!: (newTree: FilterGroup) => void;

  modalService = inject(ModalService);

  closeModal() {
    this.modalService.close();
  }
}
