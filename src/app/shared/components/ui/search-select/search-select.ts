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
  lucideInbox,
  lucidePlus
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
      lucideInbox,
      lucidePlus
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

      <!-- Desktop Dropdown -->
      @if (isOpen() && !isMobile()) {
        <div class="search-select__menu animation-slide-up" [style]="menuStyle()">
          <ng-container *ngTemplateOutlet="menuContent"></ng-container>
        </div>
      }

      <!-- Mobile Bottom Sheet -->
      @if (isOpen() && isMobile()) {
        <div class="ss-backdrop" (click)="close()"></div>
        <div class="ss-sheet">
          <div class="ss-sheet__handle"></div>
          <div class="ss-sheet__header">
            <span class="ss-sheet__title">{{ placeholder }}</span>
            <button type="button" class="ss-sheet__close" (click)="close()">
              <ng-icon name="lucideX"></ng-icon>
            </button>
          </div>
          <ng-container *ngTemplateOutlet="menuContent"></ng-container>
        </div>
      }

      <!-- Shared menu content template -->
      <ng-template #menuContent>
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

        @if (createNewLabel) {
          <button type="button" class="create-new-btn" (click)="onCreateNew()">
            <ng-icon name="lucidePlus"></ng-icon>
            {{ createNewLabel }}
          </button>
        }
      </ng-template>
    </div>
  `,
  styles: [`
    .search-select {
      position: relative;
      width: 100%;

      /* ── Trigger (aligned with CustomSelect) ──────────── */
      &__trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-muted);
        cursor: pointer;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        text-align: left;
        gap: 8px;
        font-family: inherit;
        line-height: var(--line-height-normal);

        &.has-value {
          color: var(--color-text-main);
        }

        &:hover:not(:disabled) {
          border-color: var(--color-border-hover);
        }

        &:focus-visible {
          outline: none;
          border-color: var(--color-border-focus);
          background: var(--color-bg-input-focus);
          box-shadow: var(--shadow-input-focus);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      &.is-open .search-select__trigger {
        border-color: var(--color-border-focus);
        background: var(--color-bg-input-focus);
        box-shadow: var(--shadow-input-focus);
      }

      /* ── Desktop dropdown ─────────────────────────────── */
      &__menu {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 320px;
      }
    }

    /* ── Trigger actions (clear + chevron) ────────────── */
    .trigger-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .selected-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    .selected-chips {
      display: inline-flex;
      align-items: center;
      background: var(--color-bg-active);
      color: var(--color-accent-interactive);
      padding: 2px 8px;
      border-radius: 99px;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
    }

    .chip-count { white-space: nowrap; }

    .chevron-icon {
      font-size: 14px;
      color: var(--color-text-muted);
      transition: transform var(--transition-fast);
      flex-shrink: 0;
    }

    .is-open .chevron-icon { transform: rotate(180deg); }

    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border: none;
      border-radius: 50%;
      padding: 0;
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 10px;
      transition: background var(--transition-fast);
      &:hover { background: var(--color-border-light); color: var(--color-text-main); }
    }

    /* ── Search box ──────────────────────────────────── */
    .search-box {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid var(--color-border-subtle);
      gap: 8px;
      flex-shrink: 0;

      .search-icon { color: var(--color-text-muted); font-size: 14px; flex-shrink: 0; }

      input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: var(--font-size-sm);
        color: var(--color-text-main);
        font-family: inherit;
        &::placeholder { color: var(--color-text-muted); }
      }

      .spin-icon { animation: spin 1s linear infinite; color: var(--color-accent-interactive); font-size: 14px; }
    }

    .clear-search {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: none;
      border-radius: 50%;
      padding: 0;
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 10px;
      flex-shrink: 0;
      transition: background var(--transition-fast);
      &:hover { background: var(--color-border-light); color: var(--color-text-main); }
    }

    /* ── Options list ─────────────────────────────────── */
    .options-container {
      flex: 1;
      overflow-y: auto;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 1px;
      -webkit-overflow-scrolling: touch;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { background: var(--color-border-light); border-radius: 10px; }
      &::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
    }

    .empty-results {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 20px; color: var(--color-text-muted); text-align: center;
      ng-icon { font-size: 28px; opacity: 0.35; }
      span { font-size: var(--font-size-sm); }
    }

    .load-more-spinner {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px; color: var(--color-text-muted); font-size: var(--font-size-xs);
      .spin { animation: spin 1s linear infinite; }
    }

    /* ── Option item ──────────────────────────────────── */
    .option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);

      &:hover { background: var(--color-bg-hover); }

      &.is-selected {
        background: var(--color-bg-active);
        .label { color: var(--color-accent-interactive); font-weight: var(--font-weight-semibold); }
      }

      .option-content { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .option-icon { font-size: 16px; color: var(--color-text-muted); flex-shrink: 0; }

      .option-text {
        display: flex; flex-direction: column; min-width: 0;
        .label { font-size: var(--font-size-sm); color: var(--color-text-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .description { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 1px; }
      }

      .check-icon { font-size: 14px; color: var(--color-accent-interactive); flex-shrink: 0; }
    }

    /* ── Create new button ────────────────────────────── */
    .create-new-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-top: 1px solid var(--color-border-subtle);
      background: var(--color-bg-surface);
      color: var(--color-accent-interactive);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      font-family: inherit;
      cursor: pointer;
      transition: background var(--transition-fast);
      flex-shrink: 0;
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);

      ng-icon { font-size: 14px; }
      &:hover { background: var(--color-bg-hover); }
    }

    /* ── Mobile Bottom Sheet ──────────────────────────── */
    .ss-backdrop {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4);
      z-index: var(--z-sheet); animation: ssFadeIn 0.2s ease;
    }

    .ss-sheet {
      position: fixed; bottom: 0; left: 0; right: 0;
      z-index: calc(var(--z-sheet) + 1);
      background: var(--color-bg-surface);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      max-height: 75vh;
      display: flex; flex-direction: column;
      animation: ssSheetUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      padding-bottom: env(safe-area-inset-bottom, 0);

      .search-box { border-radius: 0; }
      .options-container { flex: 1; max-height: none; }

      .option-item {
        padding: 14px 20px;
        border-radius: 0;
        border-bottom: 1px solid var(--color-border-subtle);
        &:last-child { border-bottom: none; }
        &.is-selected { background: var(--color-bg-active); }
      }

      .create-new-btn { border-radius: 0; }
    }

    .ss-sheet__handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: var(--color-border-light); margin: 8px auto 0;
    }

    .ss-sheet__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 8px;
    }

    .ss-sheet__title {
      font-size: var(--font-size-base); font-weight: var(--font-weight-semibold);
      color: var(--color-text-main);
    }

    .ss-sheet__close {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border: none; border-radius: 50%;
      background: var(--color-bg-subtle); color: var(--color-text-muted);
      cursor: pointer; font-size: 14px;
      transition: background var(--transition-fast);
      &:hover { background: var(--color-border-light); color: var(--color-text-main); }
    }

    /* ── Skeletons ────────────────────────────────────── */
    .skeletons { padding: 4px; }

    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ssFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ssSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .animation-slide-up { animation: slideInUp 0.15s ease-out; }
  `]
})
export class SearchSelectComponent implements AfterViewInit, ControlValueAccessor, OnDestroy {
  @Input() placeholder = 'Seleccionar...';
  @Input() searchPlaceholder = 'Escribe para buscar...';
  @Input() required = false;
  @Input() multiple = false;
  @Input() searchFn?: (query: string, page: number) => Observable<{ data: SearchSelectOption[], hasMore: boolean }>;
  @Input() createNewLabel?: string;

  @Output() selectionChange = new EventEmitter<SearchSelectOption | SearchSelectOption[] | null>();
  @Output() createNew = new EventEmitter<void>();

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  private _initialOption = signal<SearchSelectOption | undefined>(undefined);
  @Input() set initialOption(val: SearchSelectOption | undefined) {
    this._initialOption.set(val);
    // Sync value when initialOption is set externally (e.g. edit mode preload)
    if (val && !this.multiple) {
      this.value.set(val.value);
      this.selectedOptionsMap.update(map => {
        map.set(val.value, val);
        return new Map(map);
      });
    } else if (!val && !this.multiple) {
      this.value.set(null);
      this.selectedOptionsMap.set(new Map());
    }
  }

  private _initialOptions = signal<SearchSelectOption[]>([]);
  @Input() set initialOptions(vals: SearchSelectOption[] | null | undefined) {
    const options = vals || [];
    this._initialOptions.set(options);
    if (this.multiple && options.length > 0) {
      this.value.set(options.map(o => o.value));
      this.selectedOptionsMap.update(map => {
        options.forEach(o => map.set(o.value, o));
        return new Map(map);
      });
    }
  }
  get initialOptions(): SearchSelectOption[] {
    return this._initialOptions();
  }

  isOpen = signal(false);
  isMobile = signal(false);
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

  onChange = (_: any) => { };
  onTouched = () => { };

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

  ngAfterViewInit() { }

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
    this.isMobile.set(typeof window !== 'undefined' && window.innerWidth <= 768);

    if (!this.isMobile()) {
      this._scrollOpenedAt = Date.now();
      document.addEventListener('scroll', this._scrollHandler, { capture: true, passive: true });
      const rect = this.containerElement?.nativeElement.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuMaxHeight = 320;
        const openUp = spaceBelow < menuMaxHeight && rect.top > spaceBelow;
        const maxHeight = this.createNewLabel ? '270px' : '320px';
        this.menuStyle.set({
          position: 'fixed',
          width: `${Math.max(rect.width, 240)}px`,
          left: `${rect.left}px`,
          ...(openUp
            ? { bottom: `${window.innerHeight - rect.top + 4}px`, top: 'auto' }
            : { top: `${rect.bottom + 4}px`, bottom: 'auto' }),
          zIndex: '9999',
          maxHeight: maxHeight,
        });
      }
    } else {
      document.body.style.overflow = 'hidden';
    }

    this.isOpen.set(true);
    if (this.options().length === 0) {
      this.initialLoading.set(true);
      this.loadResults(true);
    }
    setTimeout(() => this.searchInputElement?.nativeElement.focus(), 100);
  }

  close() {
    document.removeEventListener('scroll', this._scrollHandler, { capture: true });
    document.body.style.overflow = '';
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

  onCreateNew() { this.close(); this.createNew.emit(); }

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
    if (this.isOpen() && !this.isMobile() && !this.containerElement?.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private _scrollOpenedAt = 0;
  private _scrollHandler = (e: Event) => {
    if (!this.isOpen()) return;
    // Ignorar scroll interno del propio dropdown
    if (this.containerElement?.nativeElement.contains(e.target as Node)) return;
    // Ignorar scrolls que ocurren justo despues de abrir (reflow de modales/animaciones)
    if (Date.now() - this._scrollOpenedAt < 150) return;
    this.close();
  };
}
