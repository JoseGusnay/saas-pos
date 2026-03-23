import { Component, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../layout/atoms/icon/icon.component';
import { DatePickerComponent } from '../../../shared/components/ui/date-picker/date-picker';
import { CustomSelectComponent } from '../../../shared/components/ui/custom-select/custom-select.component';
import { FilterNode, FilterGroup, FilterRule, FilterField, LogicalOperator, FilterOperator } from '../../models/query-builder.models';

@Component({
    selector: 'app-query-node',
    standalone: true,
    imports: [CommonModule, FormsModule, IconComponent, DatePickerComponent, CustomSelectComponent, forwardRef(() => QueryNodeComponent)],
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
    dropdownPosition = signal<{ top: number | null, left: number, bottom: number | null, isFlipped: boolean } | null>(null);

    // Getters for Select Display Values
    get currentFieldLabel(): string {
        if (this.isGroup) return '';
        const field = this.availableFields.find(f => f.id === this.ruleNode.field);
        return field ? field.label : this.ruleNode.field;
    }

    get availableOperators(): FilterOperator[] {
        if (this.isGroup) return [];
        const field = this.availableFields.find(f => f.id === this.ruleNode.field);
        if (!field) return ['contains', 'equals'];

        switch (field.type) {
            case 'number':
                return ['equals', 'notEqual', 'greaterThan', 'lessThan', 'inRange', 'blank', 'notBlank'];
            case 'text':
                return ['contains', 'notContains', 'equals', 'notEqual', 'startsWith', 'endsWith', 'blank', 'notBlank'];
            case 'date':
                return ['equals', 'notEqual', 'greaterThan', 'lessThan', 'inRange', 'blank', 'notBlank'];
            case 'status':
            case 'select':
                return ['equals', 'notEqual', 'blank', 'notBlank'];
            default:
                return ['equals', 'notEqual', 'contains', 'blank', 'notBlank'];
        }
    }

    get currentField(): FilterField | undefined {
        if (this.isGroup) return undefined;
        return this.availableFields.find(f => f.id === this.ruleNode.field);
    }

    get currentFieldOptions(): { label: string; value: string }[] {
        return this.currentField?.options ?? [];
    }

    get showValueInput(): boolean {
        return this.ruleNode.operator !== 'blank' && this.ruleNode.operator !== 'notBlank';
    }

    private getDefaultOperator(field: FilterField): FilterOperator {
        switch (field.type) {
            case 'number': return 'equals';
            case 'select':
            case 'status': return 'equals';
            default: return 'contains';
        }
    }

    // Detects the coordinate system for position: fixed elements relative to any containing block
    getFixedContext(trigger: HTMLElement) {
        const dummy = document.createElement('div');
        Object.assign(dummy.style, {
            position: 'fixed',
            inset: '0',
            visibility: 'hidden',
            pointerEvents: 'none'
        });

        trigger.appendChild(dummy);
        const rect = dummy.getBoundingClientRect();
        trigger.removeChild(dummy);

        return {
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
        };
    }

    toggleFieldDropdown(trigger: HTMLElement) {
        if (this.isFieldDropdownOpen()) {
            this.isFieldDropdownOpen.set(false);
            this.dropdownPosition.set(null);
        } else {
            const rect = trigger.getBoundingClientRect();
            const context = this.getFixedContext(trigger);
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const isFlipped = spaceBelow < 250;

            this.dropdownPosition.set({
                top: isFlipped ? null : rect.bottom - context.top + 4,
                bottom: isFlipped ? (context.bottom - rect.top) + 4 : null,
                left: rect.left - context.left,
                isFlipped
            });
            this.isFieldDropdownOpen.set(true);
            this.isOperatorDropdownOpen.set(false);
        }
    }

    toggleOperatorDropdown(trigger: HTMLElement) {
        if (this.isOperatorDropdownOpen()) {
            this.isOperatorDropdownOpen.set(false);
            this.dropdownPosition.set(null);
        } else {
            const rect = trigger.getBoundingClientRect();
            const context = this.getFixedContext(trigger);
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const isFlipped = spaceBelow < 250;

            this.dropdownPosition.set({
                top: isFlipped ? null : rect.bottom - context.top + 4,
                bottom: isFlipped ? (context.bottom - rect.top) + 4 : null,
                left: rect.left - context.left,
                isFlipped
            });
            this.isOperatorDropdownOpen.set(true);
            this.isFieldDropdownOpen.set(false);
        }
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
            const firstField = this.availableFields[0];
            const newRule: FilterRule = {
                type: 'rule',
                id: crypto.randomUUID(),
                field: firstField.id,
                operator: this.getDefaultOperator(firstField),
                value: ''
            };
            this.nodeChange.emit({ ...g, children: [...g.children, newRule] });
        }
    }

    addGroup() {
        if (this.isGroup && this.availableFields.length > 0) {
            const g = this.groupNode;
            const firstField = this.availableFields[0];
            const newGroup: FilterGroup = {
                type: 'group',
                id: crypto.randomUUID(),
                logicalOperator: 'AND',
                children: [{
                    type: 'rule',
                    id: crypto.randomUUID(),
                    field: firstField.id,
                    operator: this.getDefaultOperator(firstField),
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
            const field = this.availableFields.find(f => f.id === newFieldId);
            const defaultOp = field ? this.getDefaultOperator(field) : 'contains';
            this.nodeChange.emit({ ...this.ruleNode, field: newFieldId, operator: defaultOp, value: '', valueTo: undefined });
            this.isFieldDropdownOpen.set(false);
            this.dropdownPosition.set(null);
        }
    }

    onOperatorSelect(op: FilterOperator) {
        if (!this.isGroup) {
            this.nodeChange.emit({ ...this.ruleNode, operator: op });
            this.isOperatorDropdownOpen.set(false);
            this.dropdownPosition.set(null);
        }
    }



    onValueChange(newValue: string) {
        if (!this.isGroup) {
            this.nodeChange.emit({ ...this.ruleNode, value: newValue });
        }
    }

    onValueToChange(newValue: string) {
        if (!this.isGroup) {
            this.nodeChange.emit({ ...this.ruleNode, valueTo: newValue });
        }
    }

    onSelectValueChange(value: string) {
        if (!this.isGroup) {
            this.nodeChange.emit({ ...this.ruleNode, value });
        }
    }

    getOperatorLabel(operator: FilterOperator): string {
        const labels: Record<FilterOperator, string> = {
            equals: 'Es igual a',
            notEqual: 'No es igual a',
            contains: 'Contiene',
            notContains: 'No contiene',
            startsWith: 'Empieza con',
            endsWith: 'Termina con',
            blank: 'Está vacío',
            notBlank: 'No está vacío',
            greaterThan: 'Mayor que',
            lessThan: 'Menor que',
            inRange: 'En rango'
        };
        return labels[operator] || operator;
    }
}
