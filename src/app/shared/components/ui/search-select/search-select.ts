import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  effect,
  inject,
  ElementRef,
  HostListener,
  ViewChild,
  AfterViewInit,
  forwardRef,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideChevronDown, 
  lucideCheck, 
  lucideSearch, 
  lucideLoader2, 
  lucideX,
  lucideInbox
} from '@ng-icons/lucide';
import { 
  Observable, 
  Subject, 
  debounceTime, 
  distinctUntilChanged, 
  finalize, 
  takeUntil 
} from 'rxjs';
import { SearchSelectOption } from '../../../models/search-select.models';
import { SkeletonComponent } from '../skeleton/skeleton';

@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, SkeletonComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchSelectComponent),
      multi: true
    },
    provideIcons({ 
      lucideChevronDown, 
      lucideCheck, 
      lucideSearch, 
      lucideLoader2, 
      lucideX,
      lucideInbox
    })
  ],
  template: `
    <div class="search-select" [class.is-open]="isOpen()" #container>
      <!-- Trigger -->
      <button 
        type="button" 
        class="search-select__trigger" 
        [class.has-value]="hasValue()"
        (click)="toggle()"
        [disabled]="disabled"
      >
        <span class="selected-label">
          @if (multiple && value()?.length > 0) {
            <div class="selected-chips">
               <span class="chip-count">{{ value().length }} seleccionados</span>
            </div>
          } @else {
            {{ selectedLabel() || placeholder }}
          }
        </span>
        <div class="trigger-actions">
           @if (hasValue() && !required) {
             <button type="button" class="clear-btn" (click)="clear($event)">
               <ng-icon name="lucideX"></ng-icon>
             </button>
           }
           <ng-icon name="lucideChevronDown" class="chevron-icon"></ng-icon>
        </div>
      </button>

      <!-- Dropdown -->
      @if (isOpen()) {
        <div class="search-select__menu animation-slide-up" [style]="menuStyle()">
          <!-- Search Box -->
          <div class="search-box">
            <ng-icon name="lucideSearch" class="search-icon"></ng-icon>
            <input 
              #searchInput
              type="text" 
              [placeholder]="searchPlaceholder"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput($event)"
              (keydown.escape)="close()"
            >
            @if (isLoading()) {
              <ng-icon name="lucideLoader2" class="spin-icon"></ng-icon>
            } @else if (searchQuery()) {
              <button class="clear-search" (click)="resetSearch()">
                <ng-icon name="lucideX"></ng-icon>
              </button>
            }
          </div>

          <!-- Options List -->
          <div class="options-container" #optionsList (scroll)="onScroll($event)">
            @if (initialLoading() && !options().length) {
              <div class="skeletons">
                @for (i of [1,2,3,4,5,6]; track i) {
                  <div class="option-item" style="pointer-events: none;">
                    <div class="option-content">
                      <app-skeleton width="28px" height="28px" shape="circle"></app-skeleton>
                      <div class="option-text">
                        <app-skeleton width="140px" height="14px"></app-skeleton>
                        <app-skeleton width="90px" height="10px" style="margin-top: 4px;"></app-skeleton>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              @for (option of options(); track option.value) {
                <div 
                  class="option-item" 
                  [class.is-selected]="isSelected(option)"
                  (click)="select(option)"
                >
                  <div class="option-content">
                    @if (option.icon) {
                      <ng-icon [name]="option.icon" class="option-icon"></ng-icon>
                    }
                    <div class="option-text">
                      <span class="label">{{ option.label }}</span>
                      @if (option.description) {
                        <span class="description">{{ option.description }}</span>
                      }
                    </div>
                  </div>
                  @if (isSelected(option)) {
                    <ng-icon name="lucideCheck" class="check-icon"></ng-icon>
                  }
                </div>
              }

              @if (isLoadingMore()) {
                <div class="load-more-spinner">
                   <ng-icon name="lucideLoader2" class="spin"></ng-icon>
                   <span>Cargando más...</span>
                </div>
              }

              @if (!options().length && !isLoading()) {
                <div class="empty-results">
                  <ng-icon name="lucideInbox"></ng-icon>
                  <span>No se encontraron resultados</span>
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-select {
      position: relative;
      width: 100%;

      &__trigger {
        width: 100%;
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        font-size: 14px;
        color: var(--color-text-muted);
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
        text-align: left;
        gap: 8px;

        &.has-value {
          color: var(--color-text-main);
          font-weight: 500;
        }

        &:hover:not(:disabled) {
          border-color: var(--color-border-subtle);
          background: var(--color-bg-hover);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .selected-chips {
           background: var(--color-primary);
           color: white;
           padding: 2px 8px;
           border-radius: 12px;
           font-size: 11px;
           font-weight: 600;
        }
      }

      &__menu {
        /* position y coordenadas vienen del signal menuStyle() */
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-subtle);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 320px;
        backdrop-filter: blur(10px);
      }
    }

    .search-box {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid var(--color-border-light);
      position: relative;
      background: var(--color-bg-light);
      .search-icon { color: var(--color-text-muted); font-size: 14px; margin-right: 8px; }
      input { flex: 1; background: transparent; border: none; outline: none; font-size: 13px; color: var(--color-text-main); }
      .spin-icon { animation: spin 1s linear infinite; color: var(--color-primary); }
    }

    .options-container { flex: 1; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 2px; }

    .option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color 0.15s;

      &:hover { background: var(--color-bg-hover); }
      &.is-selected { background: rgba(var(--color-primary-rgb), 0.08); .label { color: var(--color-primary); font-weight: 600; } }

      .option-content { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .option-text { display: flex; flex-direction: column; min-width: 0; .label { font-size: 13px; } .description { font-size: 11px; color: var(--color-text-muted); } }
      .check-icon { font-size: 14px; color: var(--color-primary); }
    }

    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animation-slide-up { animation: slideInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class SearchSelectComponent implements AfterViewInit, ControlValueAccessor, OnDestroy {
  @Input() placeholder = 'Seleccionar...';
  @Input() searchPlaceholder = 'Escribe para buscar...';
  @Input() required = false;
  @Input() multiple = false;
  @Input() searchFn?: (query: string, page: number) => Observable<{ data: SearchSelectOption[], hasMore: boolean }>;

  @Output() selectionChange = new EventEmitter<SearchSelectOption | SearchSelectOption[] | null>();

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  private _initialOption = signal<SearchSelectOption | undefined>(undefined);
  @Input() set initialOption(val: SearchSelectOption | undefined) {
    this._initialOption.set(val);
  }

  private _initialOptions = signal<SearchSelectOption[]>([]);
  @Input() set initialOptions(vals: SearchSelectOption[] | null | undefined) {
    this._initialOptions.set(vals || []);
  }
  get initialOptions(): SearchSelectOption[] {
    return this._initialOptions();
  }

  isOpen = signal(false);
  value = signal<any>(null);
  searchQuery = signal('');
  options = signal<SearchSelectOption[]>([]);
  
  private selectedOptionsMap = signal<Map<any, SearchSelectOption>>(new Map());
  
  isLoading = signal(false);
  isLoadingMore = signal(false);
  initialLoading = signal(false);
  
  currentPage = 1;
  hasMore = true;
  disabled = false;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  hasValue = computed(() => {
    const val = this.value();
    if (this.multiple) return Array.isArray(val) && val.length > 0;
    return val !== null && val !== undefined && val !== '';
  });

  selectedLabel = computed(() => {
    if (this.multiple) return '';
    const currentVal = this.value();
    if (!currentVal) return '';

    // Search in current Options
    const opt = this.options().find(o => o.value === currentVal);
    if (opt) return opt.label;

    // Search in Map
    const mapped = this.selectedOptionsMap().get(currentVal);
    if (mapped) return mapped.label;

    // Search in Initial
    const init = this._initialOption();
    if (init && init.value === currentVal) return init.label;

    return String(currentVal);
  });

  onChange = (_: any) => {};
  onTouched = () => {};

  constructor() {
    this.setupSearch();
    
    effect(() => {
      const val = this.value();
      const init = this._initialOption();
      const inits = this._initialOptions();

      this.selectedOptionsMap.update(map => {
        if (!this.multiple && init && init.value === val) {
          map.set(init.value, init);
        }
        if (this.multiple && Array.isArray(val)) {
           inits.forEach(o => {
              if (val.includes(o.value)) map.set(o.value, o);
           });
        }
        return new Map(map);
      });
    }, { allowSignalWrites: true });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(val: any): void {
    if (this.multiple && !Array.isArray(val)) {
      this.value.set(val ? [val] : []);
    } else {
      this.value.set(val);
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  toggle() {
    if (this.disabled) return;
    this.isOpen() ? this.close() : this.open();
  }

  open() {
    document.addEventListener('scroll', this._scrollHandler, { capture: true, passive: true });
    const rect = this.containerElement?.nativeElement.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuMaxHeight = 320;
      const openUp = spaceBelow < menuMaxHeight && rect.top > spaceBelow;
      this.menuStyle.set({
        position: 'fixed',
        width: `${rect.width}px`,
        left: `${rect.left}px`,
        ...(openUp
          ? { bottom: `${window.innerHeight - rect.top + 4}px`, top: 'auto' }
          : { top: `${rect.bottom + 4}px`, bottom: 'auto' }),
        zIndex: '9999',
      });
    }
    this.isOpen.set(true);
    if (this.options().length === 0) {
      this.initialLoading.set(true);
      this.loadResults(true);
    }
    setTimeout(() => this.searchInputElement?.nativeElement.focus(), 0);
  }

  close() {
    document.removeEventListener('scroll', this._scrollHandler, { capture: true });
    this.isOpen.set(false);
    this.onTouched();
  }

  select(option: SearchSelectOption) {
    if (this.multiple) {
      const current = Array.isArray(this.value()) ? [...this.value()] : [];
      const index = current.indexOf(option.value);

      if (index >= 0) {
        current.splice(index, 1);
        this.selectedOptionsMap.update(m => { m.delete(option.value); return new Map(m); });
      } else {
        current.push(option.value);
        this.selectedOptionsMap.update(m => { m.set(option.value, option); return new Map(m); });
      }

      this.value.set(current);
      this.onChange(current);
      const selectedOpts = current.map(v => this.selectedOptionsMap().get(v)).filter(Boolean) as SearchSelectOption[];
      this.selectionChange.emit(selectedOpts);
    } else {
      this.value.set(option.value);
      this.selectedOptionsMap.update(m => { m.set(option.value, option); return new Map(m); });
      this.onChange(option.value);
      this.selectionChange.emit(option);
      this.close();
    }
  }

  isSelected(option: SearchSelectOption): boolean {
    const val = this.value();
    if (this.multiple) return Array.isArray(val) && val.includes(option.value);
    return val === option.value;
  }

  clear(event: Event) {
    event.stopPropagation();
    const clearVal = this.multiple ? [] : null;
    this.value.set(clearVal);
    this.selectedOptionsMap.set(new Map());
    this.onChange(clearVal);
    this.selectionChange.emit(this.multiple ? [] : null);
  }

  onSearchInput(event: any) { this.searchSubject.next(event.target.value); }
  resetSearch() { this.searchQuery.set(''); this.searchSubject.next(''); }

  private setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.loadResults(true);
    });
  }

  private loadResults(reset = false) {
    if (!this.searchFn) return;
    if (reset) { this.currentPage = 1; this.isLoading.set(true); } 
    else { this.isLoadingMore.set(true); }

    this.searchFn(this.searchQuery(), this.currentPage).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
        this.initialLoading.set(false);
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      if (reset) this.options.set(res.data);
      else this.options.update(prev => [...prev, ...res.data]);
      this.hasMore = res.hasMore;
    });
  }

  onScroll(event: any) {
    const el = event.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      if (!this.isLoadingMore() && this.hasMore) {
        this.currentPage++;
        this.loadResults(false);
      }
    }
  }

  @ViewChild('container') containerElement?: ElementRef<HTMLDivElement>;
  menuStyle = signal<Record<string, string>>({});
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.isOpen() && !this.containerElement?.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private _scrollHandler = (e: Event) => {
    if (!this.isOpen()) return;
    // Ignorar scroll interno del propio dropdown
    if (this.containerElement?.nativeElement.contains(e.target as Node)) return;
    this.close();
  };
}
