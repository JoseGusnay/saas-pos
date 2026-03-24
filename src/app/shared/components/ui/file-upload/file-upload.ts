import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideUpload } from '@ng-icons/lucide';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent],
  providers: [provideIcons({ lucideUpload })],
  template: `
    <div class="fu">
      @if (label()) {
        <span class="fu__label">{{ label() }}</span>
      }
      <label class="fu__area" [class.fu__area--has-file]="fileName()">
        <ng-icon name="lucideUpload" size="18"></ng-icon>
        <span>{{ fileName() || placeholder() }}</span>
        <input
          type="file"
          [accept]="accept()"
          (change)="onFileChange($event)"
          style="display:none"
        />
      </label>
      @if (hint()) {
        <span class="fu__hint">{{ hint() }}</span>
      }
    </div>
  `,
  styles: [`
    .fu {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .fu__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }

    .fu__area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      border: 1.5px dashed var(--color-border-light);
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      transition: border-color var(--transition-base), color var(--transition-base);

      &:hover {
        border-color: var(--color-accent-primary);
        color: var(--color-accent-primary);
      }

      &--has-file {
        border-style: solid;
        border-color: var(--color-accent-primary);
        color: var(--color-text-main);
      }
    }

    .fu__hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
  `]
})
export class FileUploadComponent {
  accept      = input('');
  label       = input('');
  placeholder = input('Haz clic para seleccionar un archivo');
  hint        = input('');

  fileName = signal('');

  fileSelected = output<File>();
  base64Ready  = output<string>();

  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.fileName.set(file.name);
    this.fileSelected.emit(file);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      this.base64Ready.emit(base64);
    };
    reader.readAsDataURL(file);

    (event.target as HTMLInputElement).value = '';
  }

  reset() {
    this.fileName.set('');
  }
}
