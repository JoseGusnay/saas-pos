import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucidePencil,
  lucidePackage,
  lucideInfo,
  lucideClock,
  lucideCopy,
  lucideCheck,
  lucideTag,
  lucideHash,
  lucideBarcode,
  lucideDollarSign,
  lucideBox,
  lucideHistory,
  lucideAlertCircle,
  lucideRefreshCw,
  lucidePlusCircle,
  lucideTrash,
  lucideCloudDownload,
  lucideGift,
  lucideLeaf,
  lucideWrench,
  lucideSliders,
  lucideToggleLeft,
  lucideFlame,
  lucideX
} from '@ng-icons/lucide';
import { ProductService } from '../../services/product.service';
import { BranchService } from '../../../../core/services/branch.service';
import { Branch } from '../../../../core/models/branch.models';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, catchError, of, tap, forkJoin, map } from 'rxjs';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';
import { Product, VariantBranchPrice, ProductBranchSetting } from '../../models/product.model';

type TabId = 'summary' | 'variants' | 'combo' | 'modifiers' | 'prices' | 'visibility' | 'history';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, SpinnerComponent, DatelineComponent, CurrencyPipe, DatePipe],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideArrowLeft, lucidePencil, lucidePackage, lucideInfo, lucideClock,
      lucideCopy, lucideCheck, lucideTag, lucideHash, lucideBarcode,
      lucideDollarSign, lucideBox, lucideHistory, lucideAlertCircle,
      lucideRefreshCw, lucidePlusCircle, lucideTrash, lucideCloudDownload,
      lucideGift, lucideLeaf, lucideWrench, lucideSliders, lucideToggleLeft, lucideFlame, lucideX
    })
  ]
})
export class ProductDetailPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private branchService = inject(BranchService);

  activeTab = signal<TabId>('summary');
  error = signal<string | null>(null);
  isLoading = signal(true);
  isHistoryLoading = signal(false);
  productLogs = signal<any[]>([]);

  // Prices tab state
  branches = signal<Branch[]>([]);
  pricesMap = signal<Partial<Record<string, VariantBranchPrice[]>>>({});
  pricesLoading = signal(false);
  editingKey = signal<string | null>(null);   // "variantId::branchId"
  editingValue = signal(0);
  addingVariantId = signal<string | null>(null);
  newBranchId = signal('');
  newSalePrice = signal(0);

  // Visibility tab state
  branchSettings = signal<ProductBranchSetting[]>([]);
  visibilityLoading = signal(false);

  product = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(null);
        this.isLoading.set(true);
        this.error.set(null);
        return this.productService.findOne(id).pipe(
          tap(() => this.isLoading.set(false)),
          catchError(() => {
            this.error.set('No se pudo cargar el producto.');
            this.isLoading.set(false);
            return of(null);
          })
        );
      })
    )
  );

  minPrice = computed(() => {
    const p = this.product();
    if (!p?.variants?.length) return 0;
    return Math.min(...p.variants.map(v => Number(v.salePrice)));
  });

  maxPrice = computed(() => {
    const p = this.product();
    if (!p?.variants?.length) return 0;
    return Math.max(...p.variants.map(v => Number(v.salePrice)));
  });

  isCopied = signal(false);

  typeLabel = computed(() => {
    switch (this.product()?.type) {
      case 'PHYSICAL':     return 'Físico';
      case 'SERVICE':      return 'Servicio';
      case 'COMBO':        return 'Combo';
      case 'RAW_MATERIAL': return 'Materia Prima';
      default:             return this.product()?.type ?? '';
    }
  });

  typeIcon = computed(() => {
    switch (this.product()?.type) {
      case 'SERVICE':      return 'lucideWrench';
      case 'COMBO':        return 'lucideGift';
      case 'RAW_MATERIAL': return 'lucideLeaf';
      default:             return 'lucidePackage';
    }
  });

  typeColorClass = computed(() => {
    switch (this.product()?.type) {
      case 'SERVICE':      return 'purple';
      case 'COMBO':        return 'orange';
      case 'RAW_MATERIAL': return 'green';
      default:             return 'blue';
    }
  });

  hasVariantsTab = computed(() => {
    const t = this.product()?.type;
    return t === 'PHYSICAL' || t === 'RAW_MATERIAL';
  });

  hasComboTab = computed(() => this.product()?.type === 'COMBO');

  hasPricesTab = computed(() => {
    const p = this.product();
    if (!p) return false;
    if (p.type === 'RAW_MATERIAL') return false;
    if (p.type === 'COMBO' && p.comboPriceMode === 'CALCULATED') return false;
    return true;
  });

  hasModifiersTab = computed(() => {
    const p = this.product();
    return (p?.type === 'PHYSICAL' || p?.type === 'SERVICE') && (p?.modifierGroups?.length ?? 0) > 0;
  });


  mappedLogs = computed<DatelineItem[]>(() =>
    this.productLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.userName || 'Sistema',
      icon: this.getLogIcon(log.action),
      message: log.action === 'IMPORT'
        ? `Importación masiva de ${log.details?.count} productos.`
        : undefined,
      changes: log.action === 'UPDATE' && log.details?.updatedData
        ? this.getChanges(log.details.oldData || {}, log.details.updatedData)
        : undefined
    }))
  );

  onTabChange(tab: TabId) {
    this.activeTab.set(tab);
    if (tab === 'history' && this.productLogs().length === 0) {
      this.loadHistory();
    }
    if (tab === 'prices') {
      this.initPricesFromProduct();
      this.loadBranchesIfNeeded();
    }
    if (tab === 'visibility') {
      this.initVisibilityFromProduct();
      this.loadBranchesIfNeeded();
    }
  }

  // ── Prices tab ─────────────────────────────────────────────────────────────
  getBranchName(branchId: string): string {
    return this.branches().find(b => b.id === branchId)?.name ?? branchId;
  }

  availableBranches(variantId: string): Branch[] {
    const existing = new Set((this.pricesMap()[variantId] ?? []).map(p => p.branchId));
    return this.branches().filter(b => !existing.has(b.id));
  }

  startEdit(variantId: string, branchId: string, price: number) {
    this.editingKey.set(`${variantId}::${branchId}`);
    this.editingValue.set(price);
  }

  cancelEdit() { this.editingKey.set(null); }

  confirmEdit(variantId: string, branchId: string) {
    const productId = this.product()?.id;
    if (!productId || this.editingValue() <= 0) return;
    this.productService.upsertVariantPrice(productId, variantId, branchId, { salePrice: this.editingValue() })
      .subscribe({
        next: updated => {
          this.pricesMap.update(m => ({
            ...m,
            [variantId]: (m[variantId] ?? []).map(p => p.branchId === branchId ? { ...p, salePrice: updated.salePrice } : p)
          }));
          this.cancelEdit();
        }
      });
  }

  removePrice(variantId: string, branchId: string) {
    const productId = this.product()?.id;
    if (!productId) return;
    this.productService.deleteVariantPrice(productId, variantId, branchId).subscribe({
      next: () => {
        this.pricesMap.update(m => ({
          ...m,
          [variantId]: (m[variantId] ?? []).filter(p => p.branchId !== branchId)
        }));
      }
    });
  }

  startAdd(variantId: string) {
    this.addingVariantId.set(variantId);
    this.newBranchId.set('');
    this.newSalePrice.set(0);
  }

  cancelAdd() { this.addingVariantId.set(null); }

  confirmAdd(variantId: string) {
    const productId = this.product()?.id;
    if (!productId || !this.newBranchId() || this.newSalePrice() <= 0) return;
    this.productService.upsertVariantPrice(productId, variantId, this.newBranchId(), { salePrice: this.newSalePrice() })
      .subscribe({
        next: created => {
          this.pricesMap.update(m => ({
            ...m,
            [variantId]: [...(m[variantId] ?? []), created]
          }));
          this.cancelAdd();
        }
      });
  }

  // ── Visibility tab ─────────────────────────────────────────────────────────
  settingFor(branchId: string): ProductBranchSetting | undefined {
    return this.branchSettings().find(s => s.branchId === branchId);
  }

  onBranchToggle(branchId: string, isAvailable: boolean) {
    const productId = this.product()?.id;
    if (!productId) return;
    this.productService.upsertProductBranch(productId, branchId, { isAvailable }).subscribe({
      next: updated => {
        this.branchSettings.update(settings => {
          const exists = settings.some(s => s.branchId === branchId);
          return exists
            ? settings.map(s => s.branchId === branchId ? { ...s, isAvailable } : s)
            : [...settings, updated];
        });
      }
    });
  }

  resetBranchSetting(branchId: string) {
    const productId = this.product()?.id;
    if (!productId) return;
    this.productService.deleteProductBranch(productId, branchId).subscribe({
      next: () => this.branchSettings.update(s => s.filter(x => x.branchId !== branchId))
    });
  }

  private initPricesFromProduct() {
    const p = this.product();
    if (!p || Object.keys(this.pricesMap()).length > 0) return;
    const newMap: Partial<Record<string, VariantBranchPrice[]>> = {};
    p.variants.forEach(v => {
      newMap[v.id] = (v.prices ?? []).map(pr => ({
        id: pr.id, variantId: v.id, branchId: pr.branchId,
        salePrice: pr.salePrice, isActive: pr.isActive
      }));
    });
    this.pricesMap.set(newMap);
  }

  private initVisibilityFromProduct() {
    const p = this.product();
    if (!p || this.branchSettings().length > 0) return;
    this.branchSettings.set(
      (p.branchSettings ?? []).map(s => ({
        id: s.id, productId: p.id, branchId: s.branchId, isAvailable: s.isAvailable
      }))
    );
  }

  private loadBranchesIfNeeded() {
    if (this.branches().length > 0) return;
    this.branchService.findAll({ limit: 100 }).subscribe(res => this.branches.set(res.data));
  }

  private loadHistory() {
    const id = this.product()?.id;
    if (!id) return;
    this.isHistoryLoading.set(true);
    this.productService.getLogs(id).subscribe({
      next: logs => {
        this.productLogs.set(logs);
        this.isHistoryLoading.set(false);
      },
      error: () => this.isHistoryLoading.set(false)
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }

  goBack() { this.router.navigate(['/inventario/productos']); }

  // ── Audit helpers ──────────────────────────────────────────────────────────
  private getChanges(oldData: any, newData: any) {
    const fields = [
      { field: 'name', label: 'Nombre' },
      { field: 'description', label: 'Descripción' },
      { field: 'categoryId', label: 'Categoría' },
      { field: 'brandId', label: 'Marca' },
      { field: 'isActive', label: 'Estado' }
    ];
    return fields
      .filter(f => JSON.stringify(oldData[f.field]) !== JSON.stringify(newData[f.field]))
      .map(f => ({
        ...f,
        oldValue: f.field === 'isActive' ? (oldData[f.field] ? 'Activo' : 'Inactivo') : String(oldData[f.field] || 'N/D'),
        newValue: f.field === 'isActive' ? (newData[f.field] ? 'Activo' : 'Inactivo') : String(newData[f.field] || 'N/D')
      }));
  }

  private getLogIcon(action: string): string {
    const map: Record<string, string> = {
      CREATE: 'lucidePlusCircle',
      UPDATE: 'lucideRefreshCw',
      DELETE: 'lucideTrash',
      IMPORT: 'lucideCloudDownload'
    };
    return map[action] ?? 'lucideHistory';
  }

  private getLogActionLabel(action: string): string {
    const map: Record<string, string> = {
      CREATE: 'Creación',
      UPDATE: 'Actualización',
      DELETE: 'Eliminación',
      IMPORT: 'Importación'
    };
    return map[action] ?? action;
  }
}
