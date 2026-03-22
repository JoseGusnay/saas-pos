import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed
} from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideImage, lucideX, lucideUpload } from '@ng-icons/lucide';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideImage, lucideX, lucideUpload })],
  template: `
    <div class="iu" [class.iu--uploading]="isUploading" [class.iu--disabled]="disabled">
      <label class="iu__drop" [for]="inputId">
        @if (isUploading) {
          <div class="iu__state iu__state--loading">
            <div class="iu__spinner"></div>
            <span>Subiendo imagen...</span>
          </div>
        } @else if (preview()) {
          <img [src]="preview()" alt="Preview" class="iu__preview">
          <div class="iu__overlay">
            <ng-icon name="lucideUpload"></ng-icon>
            <span>Cambiar imagen</span>
          </div>
        } @else {
          <div class="iu__state iu__state--empty">
            <div class="iu__icon-wrap">
              <ng-icon name="lucideImage"></ng-icon>
            </div>
            <p class="iu__title">Arrastra o haz clic para subir</p>
            <p class="iu__hint">PNG, JPG, WEBP · Máx 2MB</p>
          </div>
        }
      </label>

      @if (preview() && !isUploading) {
        <button
          type="button"
          class="iu__remove"
          title="Eliminar imagen"
          (click)="removeImage()"
        >
          <ng-icon name="lucideX"></ng-icon>
        </button>
      }

      <input
        [id]="inputId"
        type="file"
        accept="image/*"
        hidden
        [disabled]="disabled || isUploading"
        (change)="onFileSelected($event)"
      >
    </div>
  `,
  styles: [`
    :host { display: block; }

    .iu {
      position: relative;
      width: 100%;
      padding: .25rem;

      &--disabled { opacity: 0.6; pointer-events: none; }

      &__drop {
        display: block;
        width: 100%;
        aspect-ratio: 4 / 3;
        border: 2px dashed var(--color-border-light);
        border-radius: var(--radius-lg);
        overflow: hidden;
        cursor: pointer;
        transition: border-color var(--transition-base), background-color var(--transition-base);
        background-color: var(--color-bg-canvas);
        position: relative;

        &:hover {
          border-color: var(--color-text-muted);
          background-color: var(--color-bg-hover);

          .iu__overlay {
            opacity: 1;
          }
        }
      }

      &--uploading &__drop {
        cursor: default;
        border-style: solid;
      }

      &__state {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px;
      }

      &__state--loading {
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
        gap: 12px;
      }

      &__state--empty {
        text-align: center;
      }

      &__spinner {
        width: 24px;
        height: 24px;
        border: 2px solid var(--color-border-light);
        border-top-color: var(--color-accent-primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      &__icon-wrap {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
        font-size: 20px;
        margin-bottom: 4px;
      }

      &__title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-main);
        margin: 0;
      }

      &__hint {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        margin: 0;
      }

      &__preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      &__overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: #ffffff;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        opacity: 0;
        transition: opacity var(--transition-base);

        ng-icon { font-size: 20px; }
      }

      &__remove {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.55);
        border: none;
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: background-color var(--transition-fast);
        z-index: 2;

        &:hover { background: rgba(0, 0, 0, 0.8); }
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ImageUploadComponent {
  @Input() previewUrl: string | null = null;
  @Input() isUploading = false;
  @Input() disabled = false;

  @Output() fileSelected = new EventEmitter<File>();
  @Output() removed = new EventEmitter<void>();

  readonly inputId = `img-upload-${Math.random().toString(36).slice(2, 8)}`;

  private _localPreview = signal<string | null>(null);

  preview = computed(() => this._localPreview() ?? this.previewUrl);

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => this._localPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.fileSelected.emit(file);

    // Reset input so same file can be re-selected
    (event.target as HTMLInputElement).value = '';
  }

  removeImage() {
    this._localPreview.set(null);
    this.removed.emit();
  }
}
