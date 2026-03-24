import { Component, Input, OnInit, output, signal } from '@angular/core';
import { QueryNodeComponent } from '../../../../../../core/components/query-node/query-node.component';
import { FilterNode, FilterGroup, FilterField } from '../../../../../../core/models/query-builder.models';

@Component({
  selector: 'app-attribute-types-advanced-filters',
  standalone: true,
  imports: [QueryNodeComponent],
  template: `
    <div class="filters-body">
      <app-query-node
        [node]="$any(localTree())"
        [availableFields]="availableFields"
        [isRoot]="true"
        (nodeChange)="onLocalChange($any($event))"
      ></app-query-node>
    </div>
  `,
  styles: [`
    .filters-body { min-height: 250px; }
  `]
})
export class AttributeTypesAdvancedFilters implements OnInit {
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
