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
  of, 
  fromEvent, 
  debounceTime, 
  distinctUntilChanged, 
  switchMap, 
  tap, 
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
        [class.has-value]="value()"
        (click)="toggle()"
        [disabled]="disabled"
      >
        <span class="selected-label">
          {{ selectedLabel() || placeholder }}
        </span>
        <div class="trigger-actions">
           @if (value() && !required) {
             <button type="button" class="clear-btn" (click)="clear($event)">
               <ng-icon name="lucideX"></ng-icon>
             </button>
           }
           <ng-icon name="lucideChevronDown" class="chevron-icon"></ng-icon>
        </div>
      </button>

      <!-- Dropdown -->
      @if (isOpen()) {
        <div class="search-select__menu animation-slide-up">
          <!-- Search Input -->
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
                @for (i of [1,2,3,4]; track i) {
                  <div class="option-skeleton">
                    <app-skeleton width="24px" height="24px" shape="circle"></app-skeleton>
                    <div class="text-skel">
                      <app-skeleton width="70%" height="14px"></app-skeleton>
                      <app-skeleton width="40%" height="10px"></app-skeleton>
                    </div>
                  </div>
                }
              </div>
            } @else {
              @for (option of options(); track option.value) {
                <div 
                  class="option-item" 
                  [class.is-selected]="option.value === value()"
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
                  @if (option.value === value()) {
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
        transition: all 0.2s;
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

        &:focus {
           box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
           border-color: var(--color-primary);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .trigger-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .clear-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          cursor: pointer;
          &:hover { 
            background: var(--color-bg-light); 
            color: var(--color-danger);
          }
        }

        .chevron-icon {
          font-size: 16px;
          color: var(--color-text-muted);
          transition: transform 0.2s;
        }
      }

      &.is-open {
        .chevron-icon { transform: rotate(180deg); }
      }

      &__menu {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        z-index: 100;
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

      .search-icon {
        color: var(--color-text-muted);
        font-size: 14px;
        margin-right: 8px;
      }

      input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 13px;
        color: var(--color-text-main);
        &::placeholder { color: var(--color-text-muted); }
      }

      .spin-icon {
        animation: spin 1s linear infinite;
        color: var(--color-primary);
        font-size: 14px;
      }

      .clear-search {
        background: transparent;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        &:hover { color: var(--color-text-main); }
      }
    }

    .options-container {
      flex: 1;
      overflow-y: auto;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { 
        background: var(--color-border-subtle); 
        border-radius: 10px;
      }
    }

    .option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: var(--color-bg-hover);
      }

      &.is-selected {
        background: rgba(var(--color-primary-rgb), 0.08);
        .label { color: var(--color-primary); font-weight: 600; }
      }

      .option-content {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .option-icon {
        font-size: 16px;
        color: var(--color-text-muted);
        flex-shrink: 0;
      }

      .option-text {
        display: flex;
        flex-direction: column;
        min-width: 0;

        .label {
          font-size: 13px;
          color: var(--color-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .description {
          font-size: 11px;
          color: var(--color-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .check-icon {
        font-size: 14px;
        color: var(--color-primary);
        flex-shrink: 0;
      }
    }

    .skeletons {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
    }

    .option-skeleton {
      display: flex;
      align-items: center;
      gap: 12px;
      .text-skel {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    }

    .load-more-spinner {
       display: flex;
       align-items: center;
       justify-content: center;
       padding: 12px;
       gap: 8px;
       font-size: 12px;
       color: var(--color-text-muted);
       .spin { animation: spin 1s linear infinite; }
    }

    .empty-results {
      padding: 32px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: var(--color-text-muted);
      font-size: 13px;
      ng-icon { font-size: 24px; opacity: 0.5; }
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
  @Input() searchFn?: (query: string, page: number) => Observable<{ data: SearchSelectOption[], hasMore: boolean }>;

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('optionsList') optionsListElement?: ElementRef<HTMLDivElement>;

  /**
   * Opción inicial para mostrar el label correcto cuando el valor 
   * no está en los resultados de búsqueda actuales (evita mostrar el ID).
   */
  private _initialOption = signal<SearchSelectOption | undefined>(undefined);
  @Input() set initialOption(val: SearchSelectOption | undefined) {
    this._initialOption.set(val);
  }
  get initialOption(): SearchSelectOption | undefined {
    return this._initialOption();
  }

  isOpen = signal(false);
  value = signal<any>(null);
  searchQuery = signal('');
  options = signal<SearchSelectOption[]>([]);
  
  /**
   * Mantiene el objeto completo de la opción seleccionada actualmente
   * para poder mostrar el label incluso si desaparece de la lista (ej. al buscar).
   */
  private currentSelectedOption = signal<SearchSelectOption | undefined>(undefined);
  
  isLoading = signal(false);
  isLoadingMore = signal(false);
  initialLoading = signal(false);
  
  currentPage = 1;
  hasMore = true;
  disabled = false;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  selectedLabel = computed(() => {
    const currentValue = this.value();
    
    // 1. Intentar buscar en las opciones cargadas actualmente
    const opt = this.options().find(o => o.value === currentValue);
    if (opt) return opt.label;
    
    // 2. Si no está en las opciones, usar el objeto que tenemos guardado
    const saved = this.currentSelectedOption();
    if (saved && saved.value === currentValue) {
      return saved.label;
    }
    
    // 3. Como último recurso, intentar usar la opción inicial del input
    const init = this._initialOption();
    if (init && init.value === currentValue) {
      return init.label;
    }

    return currentValue ? String(currentValue) : '';
  });

  onTouched = () => {};
  onChange = (_: any) => {};

  constructor() {
    this.setupSearch();

    // Sincronizar el objeto de opción seleccionada (label + value)
    // Esto asegura que siempre tengamos un label para mostrar, incluso si:
    // 1. Se carga un valor inicial (initialOption)
    // 2. El usuario selecciona algo de la lista
    // 3. El valor actual se encuentra dentro de una nueva carga de opciones
    effect(() => {
      const currentVal = this.value();
      const currentOpts = this.options();
      const initOpt = this._initialOption();

      // Prioridad 1: Buscar en las opciones cargadas actualmente
      if (currentVal && currentOpts.length > 0) {
        const match = currentOpts.find(o => o.value === currentVal);
        if (match) {
          this.currentSelectedOption.set(match);
          return;
        }
      }

      // Prioridad 2: Usar la opción inicial si coincide con el valor
      if (currentVal && initOpt && initOpt.value === currentVal) {
        this.currentSelectedOption.set(initOpt);
      }
    }, { allowSignalWrites: true });
  }

  ngAfterViewInit() {
    // We can't auto-focus because it depends on isOpen()
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor
  writeValue(val: any): void {
    this.value.set(val);
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle() {
    if (this.disabled) return;
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen.set(true);
    if (this.options().length === 0) {
      this.initialLoading.set(true);
      this.loadResults(true);
    }
    setTimeout(() => this.searchInputElement?.nativeElement.focus(), 0);
  }

  close() {
    this.isOpen.set(false);
    this.onTouched();
  }

  select(option: SearchSelectOption) {
    this.value.set(option.value);
    this.currentSelectedOption.set(option);
    this.onChange(option.value);
    this.close();
  }

  clear(event: Event) {
    event.stopPropagation();
    this.value.set(null);
    this.onChange(null);
  }

  onSearchInput(event: any) {
    this.searchSubject.next(event.target.value);
  }

  resetSearch() {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

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

    if (reset) {
      this.currentPage = 1;
      this.isLoading.set(true);
    } else {
      this.isLoadingMore.set(true);
    }

    this.searchFn(this.searchQuery(), this.currentPage).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
        this.initialLoading.set(false);
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      if (reset) {
        this.options.set(res.data);
      } else {
        this.options.update(prev => [...prev, ...res.data]);
      }
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.isOpen() && !this.containerElement?.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
