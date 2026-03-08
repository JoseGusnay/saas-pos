export type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan';
export type LogicalOperator = 'AND' | 'OR';

export interface FilterField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'status';
}

export interface FilterRule {
    type: 'rule';
    id: string;
    field: string;
    operator: FilterOperator;
    value: string;
}

export interface FilterGroup {
    type: 'group';
    id: string;
    logicalOperator: LogicalOperator;
    children: FilterNode[];
}

export type FilterNode = FilterGroup | FilterRule;
