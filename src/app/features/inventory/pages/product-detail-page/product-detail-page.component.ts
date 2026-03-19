import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideArrowLeft, 
  lucidePencil, 
  lucidePackage, 
  lucideBarChart3, 
  lucideInfo,
  lucideClock,
  lucideExternalLink,
  lucideAlertCircle,
  lucideCopy,
  lucideCheck
} from '@ng-icons/lucide';
import { ProductService } from '../../services/product.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, catchError, of } from 'rxjs';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { Product } from '../../models/product.model';

type TabId = 'summary' | 'inventory' | 'reports';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, SpinnerComponent],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ 
      lucideArrowLeft, 
      lucidePencil, 
      lucidePackage, 
      lucideBarChart3, 
      lucideInfo,
      lucideClock,
      lucideExternalLink,
      lucideAlertCircle,
      lucideCopy,
      lucideCheck
    })
  ]
})
export class ProductDetailPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);

  activeTab = signal<TabId>('summary');
  isLoading = signal(false);
  error = signal<string | null>(null);

  product = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(null);
        this.isLoading.set(true);
        this.error.set(null);
        return this.productService.findOne(id).pipe(
          catchError(err => {
            this.error.set('No se pudo cargar el producto. Es posible que no exista o haya un error de red.');
            this.isLoading.set(false);
            return of(null);
          })
        );
      })
    )
  );

  onTabChange(tab: TabId) {
    this.activeTab.set(tab);
  }

  isCopied = signal(false);
  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }

  get inventoryTotal() {
    const p = this.product();
    if (!p?.variants) return 0;
    // For now, let's assume stock is not yet in the entity or just sum something
    return p.variants.length; 
  }

  getMinPrice() {
    const p = this.product();
    if (!p?.variants?.length) return 0;
    return Math.min(...p.variants.map(v => v.salePrice));
  }
}
