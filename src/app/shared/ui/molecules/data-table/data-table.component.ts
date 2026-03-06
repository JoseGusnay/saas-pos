import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
    computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from '../../atoms/empty-state/empty-state.component';

export interface TableColumn<T = any> {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

export interface SortEvent {
    field: string;
    direction: 'asc' | 'desc';
}

export interface PageEvent {
    page: number;
    limit: number;
}

/**
 * DataTable — DS Molecule (Generic, reusable)
 * Slot-based table that renders columns + uses ng-content for cell customization.
 * Parent defines columns config; cells are rendered via ng-content template rows.
 */
@Component({
    selector: 'ui-data-table',
    standalone: true,
    imports: [CommonModule, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="data-table-wrapper">
            <!-- Loading skeleton -->
            @if (loading()) {
                <div class="data-table__loading">
                    <div class="data-table__skeleton" *ngFor="let i of skeletonRows">
                        <span class="skeleton-line"></span>
                    </div>
                </div>
            }

            <!-- Table -->
            @if (!loading()) {
                <div class="data-table__scroll">
                    <table class="data-table">
                        <thead class="data-table__head">
                            <tr>
                                @for (col of columns(); track col.key) {
                                    <th
                                        class="data-table__th"
                                        [class.data-table__th--sortable]="col.sortable"
                                        [class.data-table__th--active]="sortField() === col.key"
                                        [style.width]="col.width"
                                        [style.textAlign]="col.align ?? 'left'"
                                        (click)="col.sortable && onSort(col.key)"
                                    >
                                        <span class="data-table__th-content">
                                            {{ col.label }}
                                            @if (col.sortable) {
                                                <svg class="data-table__sort-icon"
                                                     [class.data-table__sort-icon--asc]="sortField() === col.key && sortDir() === 'asc'"
                                                     [class.data-table__sort-icon--desc]="sortField() === col.key && sortDir() === 'desc'"
                                                     viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M8 9l4-4 4 4M16 15l-4 4-4-4"/>
                                                </svg>
                                            }
                                        </span>
                                    </th>
                                }
                            </tr>
                        </thead>
                        <tbody class="data-table__body">
                            <!-- Row content projected from parent -->
                            <ng-content select="[rows]" />
                        </tbody>
                    </table>

                    <!-- Empty state -->
                    @if (total() === 0) {
                        <ui-empty-state
                            title="Sin resultados"
                            description="No se encontraron registros. Intenta con otro filtro."
                            icon="M9 17H5a2 2 0 0 0-2 2M21 17h-4a2 2 0 0 1-2-2M13 7H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
                        >
                            <ng-content select="[empty-action]" action />
                        </ui-empty-state>
                    }
                </div>

                <!-- Pagination -->
                @if (total() > 0) {
                    <div class="data-table__pagination">
                        <span class="data-table__count">
                            Mostrando {{ rangeStart() }}–{{ rangeEnd() }} de {{ total() }}
                        </span>
                        <div class="data-table__pager">
                            <button
                                class="pager-btn"
                                [disabled]="page() <= 1"
                                (click)="onPage(page() - 1)"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M15 18l-6-6 6-6"/>
                                </svg>
                            </button>

                            @for (p of pageNumbers(); track p) {
                                <button
                                    class="pager-btn"
                                    [class.pager-btn--active]="p === page()"
                                    (click)="onPage(p)"
                                >{{ p }}</button>
                            }

                            <button
                                class="pager-btn"
                                [disabled]="page() >= totalPages()"
                                (click)="onPage(page() + 1)"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                }
            }
        </div>
    `,
    styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
    readonly columns = input.required<TableColumn[]>();
    readonly total = input<number>(0);
    readonly page = input<number>(1);
    readonly limit = input<number>(10);
    readonly loading = input<boolean>(false);
    readonly sortField = input<string>('');
    readonly sortDir = input<'asc' | 'desc'>('asc');

    readonly sortChanged = output<SortEvent>();
    readonly pageChanged = output<PageEvent>();

    readonly skeletonRows = Array(6).fill(0);

    readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));
    readonly rangeStart = computed(() => (this.page() - 1) * this.limit() + 1);
    readonly rangeEnd = computed(() => Math.min(this.page() * this.limit(), this.total()));

    readonly pageNumbers = computed(() => {
        const total = this.totalPages();
        const current = this.page();
        const delta = 2;
        const range: number[] = [];
        for (
            let i = Math.max(1, current - delta);
            i <= Math.min(total, current + delta);
            i++
        ) {
            range.push(i);
        }
        return range;
    });

    onSort(field: string): void {
        const newDir =
            this.sortField() === field && this.sortDir() === 'asc' ? 'desc' : 'asc';
        this.sortChanged.emit({ field, direction: newDir });
    }

    onPage(p: number): void {
        if (p < 1 || p > this.totalPages()) return;
        this.pageChanged.emit({ page: p, limit: this.limit() });
    }
}
