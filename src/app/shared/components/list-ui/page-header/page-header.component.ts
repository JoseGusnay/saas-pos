import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/layout/atoms/icon/icon.component';

export interface PageHeaderTab {
    label: string;
    value: string;
}

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [CommonModule, IconComponent],
    template: `
    <header class="page-header">
      <div class="page-header__title-group">
        <h1 class="page-header__title">{{ title }}</h1>
        
        @if (tabs.length > 0) {
          <nav class="page-header__tabs">
            @for (tab of tabs; track tab.value) {
              <button 
                class="page-header__tab" 
                [class.page-header__tab--active]="activeTab === tab.value"
                (click)="tabChange.emit(tab.value)"
              >
                {{ tab.label }}
              </button>
            }
          </nav>
        }
      </div>
      
      @if (ctaText) {
        <button class="page-header__cta" (click)="ctaClick.emit()">
          @if (ctaIcon) {
            <app-icon [name]="ctaIcon"></app-icon>
          }
          <span>{{ ctaText }}</span>
        </button>
      }
    </header>
  `,
    styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent {
    @Input({ required: true }) title!: string;
    @Input() tabs: PageHeaderTab[] = [];
    @Input() activeTab: string = '';
    @Input() ctaText: string = '';
    @Input() ctaIcon: string = 'lucidePlus'; // default icon

    @Output() tabChange = new EventEmitter<string>();
    @Output() ctaClick = new EventEmitter<void>();
}
