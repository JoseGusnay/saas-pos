import { Component, Input, OnInit, output, signal } from '@angular/core';
import { QueryNodeComponent } from '../../../../../../core/components/query-node/query-node.component';
import { FilterNode, FilterGroup, FilterField } from '../../../../../../core/models/query-builder.models';

@Component({
  selector: 'app-branches-advanced-filters',
  standalone: true,
  imports: [QueryNodeComponent],
  templateUrl: './branches-advanced-filters.html',
  styleUrl: './branches-advanced-filters.scss',
})
export class BranchesAdvancedFilters implements OnInit {
  @Input({ required: true }) filterTree!: () => FilterGroup;
  @Input({ required: true }) availableFields!: FilterField[];

  applied = output<FilterGroup>();

  localTree = signal<FilterGroup>({
    type: 'group', id: 'root', logicalOperator: 'AND', children: []
  });

  ngOnInit() {
    this.localTree.set(structuredClone(this.filterTree()));
  }

  refresh() {
    this.localTree.set(structuredClone(this.filterTree()));
  }

  onLocalChange(node: FilterNode) {
    if (node.type === 'group') {
      this.localTree.set(node as FilterGroup);
    }
  }

  applyFilters() {
    this.applied.emit(this.localTree());
  }
}
