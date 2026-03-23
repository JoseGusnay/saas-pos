import { FilterGroup, FilterNode, FilterField, AgGridFilterModel, AgGridFilterCondition } from '../models/query-builder.models';

export class QueryMapper {
    /**
     * Convierte un árbol de filtros recursivo (FilterGroup) al formato Ag-Grid que espera el backend.
     * Pasa fields para derivar filterType dinámicamente desde la config de cada módulo.
     */
    static toAgGridFilterModel(node: FilterGroup, fields?: FilterField[]): AgGridFilterModel {
        const model: AgGridFilterModel = {};
        const fieldMap = new Map(fields?.map(f => [f.id, f]) ?? []);

        node.children.forEach(child => {
            if (child.type === 'rule') {
                const field = child.field;
                const filterType = this.getFilterType(field, fieldMap);
                const condition: AgGridFilterCondition = {
                    filterType,
                    type: child.operator,
                    filter: filterType === 'number' ? Number(child.value) : child.value,
                    ...(child.operator === 'inRange' && child.valueTo !== undefined
                        ? { filterTo: filterType === 'date' ? child.valueTo : Number(child.valueTo) }
                        : {})
                };

                if (model[field]) {
                    const existing: any = model[field];
                    if (existing.conditions) {
                        existing.conditions.push(condition);
                    } else {
                        model[field] = {
                            operator: node.logicalOperator,
                            conditions: [existing as AgGridFilterCondition, condition]
                        };
                    }
                } else {
                    model[field] = condition;
                }
            } else if (child.type === 'group') {
                const subModel = this.toAgGridFilterModel(child, fields);
                Object.assign(model, subModel);
            }
        });

        return model;
    }

    private static getFilterType(field: string, fieldMap: Map<string, FilterField>): 'text' | 'number' | 'date' | 'set' {
        const fieldConfig = fieldMap.get(field);
        if (fieldConfig) {
            switch (fieldConfig.type) {
                case 'number': return 'number';
                case 'date': return 'date';
                case 'select':
                case 'status': return 'set';
                default: return 'text';
            }
        }
        // Fallback para campos sin config
        return 'text';
    }
}
