import { FilterGroup, FilterNode, AgGridFilterModel, AgGridFilterCondition } from '../models/query-builder.models';

export class QueryMapper {
    /**
     * Convierte un árbol de filtros recursivo (FilterGroup) al formato Ag-Grid que espera el backend.
     * Nota: El backend actual soporta filtros por campo, si hay múltiples reglas para el mismo campo
     * las agrupa bajo el mismo nodo de Ag-Grid.
     */
    static toAgGridFilterModel(node: FilterGroup): AgGridFilterModel {
        const model: AgGridFilterModel = {};

        // Recorremos los hijos directos del root (o del grupo actual)
        node.children.forEach(child => {
            if (child.type === 'rule') {
                const field = child.field;
                const filterType = this.getFilterType(field);
                const condition: AgGridFilterCondition = {
                    filterType,
                    type: child.operator,
                    filter: filterType === 'number' ? Number(child.value) : child.value,
                    ...(child.operator === 'inRange' && child.valueTo !== undefined
                        ? { filterTo: Number(child.valueTo) }
                        : {})
                };

                // Si ya existe el campo en el modelo, lo convertimos a multi-condición
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
                // El backend actual tiene una limitación: espera un objeto plano donde las llaves son campos.
                // Si hay grupos anidados, aplanamos sus reglas al nivel superior intentando mantener la lógica.
                const subModel = this.toAgGridFilterModel(child);
                Object.assign(model, subModel);
            }
        });

        return model;
    }

    private static getFilterType(field: string): 'text' | 'number' | 'date' | 'set' {
        const numberFields = ['revenue', 'limit', 'variants.salePrice', 'variants.costPrice', 'salePrice', 'costPrice'];
        const setFields = ['isActive', 'isMain', 'type'];
        if (numberFields.includes(field)) return 'number';
        if (setFields.includes(field)) return 'set';
        return 'text';
    }
}
