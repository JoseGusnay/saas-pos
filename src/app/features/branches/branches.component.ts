import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    inject,
    signal,
    computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BranchesService } from './branches.service';
import { Branch, BranchForm, BRANCH_EMPTY_FORM } from './branch.model';

import { PageHeaderComponent } from '../../shared/ui/molecules/page-header/page-header.component';
import { DataTableComponent, TableColumn, SortEvent, PageEvent } from '../../shared/ui/molecules/data-table/data-table.component';
import { TableActionMenuComponent, TableAction } from '../../shared/ui/molecules/table-action-menu/table-action-menu.component';
import { ModalComponent } from '../../shared/ui/molecules/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/ui/molecules/confirm-dialog/confirm-dialog.component';
import { ToggleSwitchComponent } from '../../shared/ui/molecules/toggle-switch/toggle-switch.component';
import { BadgeComponent } from '../../shared/ui/atoms/badge/badge.component';
import { ButtonComponent } from '../../shared/ui/atoms/button/button.component';

@Component({
    selector: 'app-branches',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        DataTableComponent,
        TableActionMenuComponent,
        ModalComponent,
        ConfirmDialogComponent,
        ToggleSwitchComponent,
        BadgeComponent,
        ButtonComponent,
    ],
    templateUrl: './branches.component.html',
    styleUrl: './branches.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesComponent implements OnInit {
    private readonly svc = inject(BranchesService);

    // ─── Table state ──────────────────────────────────────────────────────────
    readonly branches = signal<Branch[]>([]);
    readonly total = signal(0);
    readonly loading = signal(false);
    readonly page = signal(1);
    readonly limit = signal(10);
    readonly search = signal('');
    readonly sortField = signal('createdAt');
    readonly sortDir = signal<'asc' | 'desc'>('desc');

    // ─── Modal state ──────────────────────────────────────────────────────────
    readonly modalOpen = signal(false);
    readonly modalMode = signal<'create' | 'edit'>('create');
    readonly editingId = signal<string | null>(null);
    readonly saving = signal(false);
    readonly form = signal<BranchForm>({ ...BRANCH_EMPTY_FORM });

    // ─── Delete state ─────────────────────────────────────────────────────────
    readonly confirmOpen = signal(false);
    readonly deletingId = signal<string | null>(null);
    readonly deleting = signal(false);

    // ─── Modal title computed ─────────────────────────────────────────────────
    readonly modalTitle = computed(() =>
        this.modalMode() === 'create' ? 'Nueva Sucursal' : 'Editar Sucursal'
    );

    // ─── Table columns ─────────────────────────────────────────────────────────
    readonly columns: TableColumn[] = [
        { key: 'name', label: 'Nombre', sortable: true },
        { key: 'city', label: 'Ciudad', sortable: true },
        { key: 'phone', label: 'Teléfono', sortable: false },
        { key: 'isActive', label: 'Estado', sortable: true, align: 'center' },
        { key: 'actions', label: '', sortable: false, width: '4rem', align: 'right' },
    ];

    readonly rowActions: TableAction[] = [
        {
            id: 'edit',
            label: 'Editar',
            icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z',
        },
        {
            id: 'delete',
            label: 'Eliminar',
            icon: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
            variant: 'danger',
        },
    ];

    // ─── Search debounce ──────────────────────────────────────────────────────
    private readonly search$ = new Subject<string>();

    constructor() {
        this.search$
            .pipe(
                debounceTime(350),
                tap(v => { this.search.set(v); this.page.set(1); }),
                switchMap(() => this.load$()),
                takeUntilDestroyed(),
            )
            .subscribe();
    }

    ngOnInit(): void {
        this.loadBranches();
    }

    // ─── Data loading ─────────────────────────────────────────────────────────
    loadBranches(): void {
        this.loading.set(true);
        this.svc.findAll({
            page: this.page(),
            limit: this.limit(),
            search: this.search(),
            sortField: this.sortField(),
            sortOrder: this.sortDir(),
        }).subscribe({
            next: ({ data, total }) => {
                this.branches.set(data);
                this.total.set(total);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    private load$() {
        this.loading.set(true);
        return this.svc.findAll({
            page: this.page(),
            limit: this.limit(),
            search: this.search(),
            sortField: this.sortField(),
            sortOrder: this.sortDir(),
        }).pipe(
            tap(({ data, total }) => {
                this.branches.set(data);
                this.total.set(total);
                this.loading.set(false);
            })
        );
    }

    onSearch(value: string): void {
        this.search$.next(value);
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDir.set(event.direction);
        this.loadBranches();
    }

    onPageChange(event: PageEvent): void {
        this.page.set(event.page);
        this.loadBranches();
    }

    // ─── Toggle active inline ─────────────────────────────────────────────────
    onToggleActive(branch: Branch, value: boolean): void {
        this.svc.patch(branch.id, { isActive: value }).subscribe(() => {
            this.branches.update(list =>
                list.map(b => b.id === branch.id ? { ...b, isActive: value } : b)
            );
        });
    }

    // ─── Row actions ──────────────────────────────────────────────────────────
    onRowAction(action: TableAction, branch: Branch): void {
        if (action.id === 'edit') this.openEdit(branch);
        if (action.id === 'delete') this.openDelete(branch);
    }

    // ─── Modal ────────────────────────────────────────────────────────────────
    openCreate(): void {
        this.form.set({ ...BRANCH_EMPTY_FORM });
        this.editingId.set(null);
        this.modalMode.set('create');
        this.modalOpen.set(true);
    }

    openEdit(branch: Branch): void {
        this.form.set({
            name: branch.name,
            address: branch.address ?? '',
            phone: branch.phone ?? '',
            city: branch.city ?? '',
            isMain: branch.isMain,
        });
        this.editingId.set(branch.id);
        this.modalMode.set('edit');
        this.modalOpen.set(true);
    }

    closeModal(): void {
        this.modalOpen.set(false);
    }

    saveForm(): void {
        const f = this.form();
        if (!f.name.trim()) return;

        this.saving.set(true);
        const op = this.modalMode() === 'create'
            ? this.svc.create(f)
            : this.svc.update(this.editingId()!, f);

        op.subscribe({
            next: () => {
                this.saving.set(false);
                this.closeModal();
                this.loadBranches();
            },
            error: () => this.saving.set(false),
        });
    }

    updateForm(partial: Partial<BranchForm>): void {
        this.form.update(f => ({ ...f, ...partial }));
    }

    // ─── Delete ───────────────────────────────────────────────────────────────
    openDelete(branch: Branch): void {
        this.deletingId.set(branch.id);
        this.confirmOpen.set(true);
    }

    onConfirmDelete(): void {
        const id = this.deletingId();
        if (!id) return;
        this.deleting.set(true);
        this.svc.remove(id).subscribe({
            next: () => {
                this.deleting.set(false);
                this.confirmOpen.set(false);
                this.loadBranches();
            },
            error: () => this.deleting.set(false),
        });
    }

    onCancelDelete(): void {
        this.confirmOpen.set(false);
        this.deletingId.set(null);
    }
}
