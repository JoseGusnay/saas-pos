import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueryNodeComponent } from '../../../../../../core/components/query-node/query-node.component';
import { FilterNode, FilterGroup, FilterField } from '../../../../../../core/models/query-builder.models';
import { ModalService } from '../../../../../../core/components/modal/modal.service';

@Component({
  selector: 'app-user-advanced-filters',
  standalone: true,
  imports: [CommonModule, QueryNodeComponent],
  template: `
    <div class="users-page__query-body">
        <app-query-node 
            [node]="$any(filterTree())" 
            [availableFields]="availableFields" 
            [isRoot]="true"
            (nodeChange)="onFilterTreeChange($any($event))">
        </app-query-node>
    </div>
  `,
  styles: [`
    @use "../../../../../../../styles/abstracts/mixins" as *;

    .users-page {
        &__query-body {
            min-height: 250px;
        }
    }
  `]
})
export class UserAdvancedFilters {
  // Inputs Dinámicos que recibiremos de NgComponentOutlet
  @Input({ required: true }) filterTree!: () => FilterGroup;
  @Input({ required: true }) availableFields!: FilterField[];
  @Input({ required: true }) onFilterTreeChange!: (newTree: FilterGroup) => void;

  modalService = inject(ModalService);

  closeModal() {
    this.modalService.close();
  }
}
