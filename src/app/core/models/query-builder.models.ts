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
    options?: { label: string; value: string }[];
}

export interface FilterRule {
    type: 'rule';
    id: string;
    field: string;
    operator: FilterOperator;
    value: string;
    valueTo?: string;
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
    filterType?: 'text' | 'number' | 'date' | 'set' | 'boolean';
    type?: FilterOperator;
    filter?: string | number | boolean;
    filterTo?: number;
}

export interface AgGridFilterModel {
    [key: string]: AgGridFilterCondition | { operator: 'AND' | 'OR'; conditions: AgGridFilterCondition[] };
}
