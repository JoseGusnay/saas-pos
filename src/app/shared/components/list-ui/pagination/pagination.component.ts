import { Component, Input, Output, EventEmitter, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/layout/atoms/icon/icon.component';

@Component({
    selector: 'app-pagination',
    standalone: true,
    imports: [CommonModule, IconComponent],
    template: `
    @if (totalItems > 0) {
      <footer class="pagination">
        <span class="pagination__info">
          {{ infoTextPrefix }} {{ startIndex }} - {{ endIndex }} {{ infoTextMiddle }} {{ totalItems }} {{ infoTextSuffix }}
        </span>
        <div class="pagination__controls">
          <button 
            class="pagination__btn" 
            [disabled]="currentPage === 1"
            (click)="onPrev()"
          >
            <app-icon name="lucideChevronLeft"></app-icon>
            {{ prevText }}
          </button>
          <button 
            class="pagination__btn" 
            [disabled]="currentPage >= totalPages"
            (click)="onNext()"
          >
            {{ nextText }}
            <app-icon name="lucideChevronRight"></app-icon>
          </button>
        </div>
      </footer>
    }
  `,
    styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
    @Input({ required: true }) totalItems!: number;
    @Input({ required: true }) currentPage!: number;
    @Input({ required: true }) pageSize!: number;

    @Input() infoTextPrefix: string = 'Mostrando';
    @Input() infoTextMiddle: string = 'de';
    @Input() infoTextSuffix: string = '';
    @Input() prevText: string = 'Anterior';
    @Input() nextText: string = 'Siguiente';

    @Output() pageChange = new EventEmitter<number>();

    get totalPages(): number {
        return Math.ceil(this.totalItems / this.pageSize) || 1;
    }

    get startIndex(): number {
        if (this.totalItems === 0) return 0;
        return (this.currentPage - 1) * this.pageSize + 1;
    }

    get endIndex(): number {
        return Math.min(this.currentPage * this.pageSize, this.totalItems);
    }

    onNext() {
        if (this.currentPage < this.totalPages) {
            this.pageChange.emit(this.currentPage + 1);
        }
    }

    onPrev() {
        if (this.currentPage > 1) {
            this.pageChange.emit(this.currentPage - 1);
        }
    }
}
