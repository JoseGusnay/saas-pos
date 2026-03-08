import { Component, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../layout/atoms/icon/icon.component';
import { FilterNode, FilterGroup, FilterRule, FilterField, LogicalOperator, FilterOperator } from '../../models/query-builder.models';

@Component({
    selector: 'app-query-node',
    standalone: true,
    imports: [CommonModule, FormsModule, IconComponent, forwardRef(() => QueryNodeComponent)],
    templateUrl: './query-node.component.html',
    styleUrl: './query-node.component.scss'
})
export class QueryNodeComponent {
    @Input({ required: true }) node!: FilterNode;
    @Input({ required: true }) availableFields!: FilterField[];
    @Input() isRoot = false;

    @Output() nodeChange = new EventEmitter<FilterNode>();
    @Output() removeNode = new EventEmitter<string>();

    get isGroup(): boolean { return this.node.type === 'group'; }
    get groupNode(): FilterGroup { return this.node as FilterGroup; }
    get ruleNode(): FilterRule { return this.node as FilterRule; }

    // Custom Select Local State Signals
    isFieldDropdownOpen = signal(false);
    isOperatorDropdownOpen = signal(false);

    // Getters for Select Display Values
    get currentFieldLabel(): string {
        if (this.isGroup) return '';
        const field = this.availableFields.find(f => f.id === this.ruleNode.field);
        return field ? field.label : this.ruleNode.field;
    }

    get availableOperators(): FilterOperator[] {
        if (this.isGroup) return [];
        return this.ruleNode.field === 'revenue'
            ? ['greaterThan', 'lessThan', 'equals']
            : ['contains', 'equals'];
    }

    // Toggle Methods ensuring mutually exclusive dropdowns
    toggleFieldDropdown() {
        this.isFieldDropdownOpen.update(v => !v);
        if (this.isFieldDropdownOpen()) this.isOperatorDropdownOpen.set(false);
    }

    toggleOperatorDropdown() {
        this.isOperatorDropdownOpen.update(v => !v);
        if (this.isOperatorDropdownOpen()) this.isFieldDropdownOpen.set(false);
    }

    toggleLogicalOperator() {
        if (this.isGroup) {
            const g = this.groupNode;
            const newOp = g.logicalOperator === 'AND' ? 'OR' : 'AND';
            this.nodeChange.emit({ ...g, logicalOperator: newOp });
        }
    }

    addRule() {
        if (this.isGroup && this.availableFields.length > 0) {
            const g = this.groupNode;
            const newRule: FilterRule = {
                type: 'rule',
                id: crypto.randomUUID(),
                field: this.availableFields[0].id,
                operator: 'contains',
                value: ''
            };
            this.nodeChange.emit({ ...g, children: [...g.children, newRule] });
        }
    }

    addGroup() {
        if (this.isGroup && this.availableFields.length > 0) {
            const g = this.groupNode;
            const newGroup: FilterGroup = {
                type: 'group',
                id: crypto.randomUUID(),
                logicalOperator: 'AND',
                children: [{
                    type: 'rule',
                    id: crypto.randomUUID(),
                    field: this.availableFields[0].id,
                    operator: 'contains',
                    value: ''
                }]
            };
            this.nodeChange.emit({ ...g, children: [...g.children, newGroup] });
        }
    }

    onRemoveChild(childId: string) {
        if (this.isGroup) {
            const g = this.groupNode;
            const newChildren = g.children.filter(c => c.id !== childId);
            this.nodeChange.emit({ ...g, children: newChildren });
        }
    }

    onChildChange(updatedChild: FilterNode) {
        if (this.isGroup) {
            const g = this.groupNode;
            const newChildren = g.children.map(c => c.id === updatedChild.id ? updatedChild : c);
            this.nodeChange.emit({ ...g, children: newChildren });
        }
    }

    onFieldSelect(newFieldId: string) {
        if (!this.isGroup) {
            const defaultOp = newFieldId === 'revenue' ? 'greaterThan' : 'contains';
            this.nodeChange.emit({ ...this.ruleNode, field: newFieldId, operator: defaultOp });
            this.isFieldDropdownOpen.set(false);
        }
    }

    onOperatorSelect(op: FilterOperator) {
        if (!this.isGroup) {
            this.nodeChange.emit({ ...this.ruleNode, operator: op });
            this.isOperatorDropdownOpen.set(false);
        }
    }



    onValueChange(newValue: string) {
        if (!this.isGroup) {
            this.nodeChange.emit({ ...this.ruleNode, value: newValue });
        }
    }

    getOperatorLabel(operator: FilterOperator): string {
        const labels: Record<FilterOperator, string> = {
            equals: 'es idéntico a',
            contains: 'contiene',
            greaterThan: 'es mayor a',
            lessThan: 'es menor a'
        };
        return labels[operator] || operator;
    }
}
