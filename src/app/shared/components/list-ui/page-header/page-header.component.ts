import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabBarComponent, TabItem } from '../../ui/tab-bar/tab-bar';
import { FormButtonComponent } from '../../ui/form-button/form-button';

export interface PageHeaderTab {
    label: string;
    value: string;
}

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [CommonModule, TabBarComponent, FormButtonComponent],
    template: `
    <header class="page-header">
      <div class="page-header__top-row">
        <h1 class="page-header__title">{{ title }}</h1>

        <div class="page-header__actions">
          <ng-content select="[headerActions]"></ng-content>

          @if (secondaryCtaText) {
            <app-form-button
              [label]="secondaryCtaText"
              [icon]="secondaryCtaIcon || undefined"
              variant="ghost"
              type="button"
              [fullWidth]="false"
              (click)="secondaryCtaClick.emit()"
            />
          }

          @if (ctaText) {
            <app-form-button
              [label]="ctaText"
              [icon]="ctaIcon"
              variant="primary"
              type="button"
              [fullWidth]="false"
              (click)="ctaClick.emit()"
            />
          }
        </div>
      </div>

      @if (tabs.length > 0) {
        <app-tab-bar
          [tabs]="tabs"
          [activeTab]="activeTab"
          (tabChange)="tabChange.emit($event)"
        ></app-tab-bar>
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
    @Input() ctaIcon: string = 'lucidePlus';
    @Input() secondaryCtaText: string = '';
    @Input() secondaryCtaIcon: string = '';

    @Output() tabChange = new EventEmitter<string>();
    @Output() ctaClick = new EventEmitter<void>();
    @Output() secondaryCtaClick = new EventEmitter<void>();
}
