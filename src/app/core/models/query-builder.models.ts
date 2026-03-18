export type FilterOperator =
    | 'equals'
    | 'notEqual'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'endsWith'
    | 'blank'
    | 'notBlank'
    | 'greaterThan'
    | 'lessThan'
    | 'inRange';
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

// Ag-Grid compatibility for backend
export interface AgGridFilterCondition {
    filterType?: 'text' | 'number' | 'date' | 'set';
    type?: FilterOperator;
    filter?: string | number;
}

export interface AgGridFilterModel {
    [key: string]: AgGridFilterCondition | { operator: 'AND' | 'OR'; conditions: AgGridFilterCondition[] };
}
