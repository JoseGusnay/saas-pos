import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/layout/atoms/icon/icon.component';
import { ActionItem, ActionsMenuComponent } from '../../ui/actions-menu/actions-menu';

export interface DataCardDetail {
  icon: string;
  text: string;
}

export interface DataCardMetric {
  label: string;
  value: string;
}

export interface DataCardAvatar {
  url: string;
  name: string;
}

@Component({
  selector: 'app-data-card',
  standalone: true,
  imports: [CommonModule, IconComponent, ActionsMenuComponent],
  template: `
    <article class="data-card" [class.data-card--has-image]="imageUrl !== undefined && imageUrl !== null">

      @if (imageUrl !== undefined) {
        <div class="data-card__image-zone">
          @if (imageUrl) {
            <img [src]="imageUrl" [alt]="title" class="data-card__img">
          } @else {
            <div class="data-card__img-placeholder">
              <span>{{ title[0]?.toUpperCase() }}</span>
            </div>
          }
        </div>
      }

      <header class="data-card__header">
        <div class="data-card__title-container">
          <h3 class="data-card__name">{{ title }}</h3>
          @if (status) {
            <span 
              class="data-card__status" 
              [class.data-card__status--inactive]="statusConfig === 'inactive'"
              [class.data-card__status--warning]="statusConfig === 'warning'"
            >
              {{ status }}
            </span>
          }
        </div>
        
        <div class="data-card__kebab" *ngIf="actions.length > 0">
          <app-actions-menu 
            [actions]="actions" 
            (actionClick)="actionClick.emit($event)">
          </app-actions-menu>
        </div>
      </header>

      <div class="data-card__body">
        @for (detail of details; track detail.text) {
          <div class="data-card__detail">
            <app-icon [name]="detail.icon"></app-icon>
            <span>{{ detail.text }}</span>
          </div>
        }
        <ng-content></ng-content>
      </div>

      @if (metric || (avatars && avatars.length > 0)) {
        <footer class="data-card__footer">
          <ng-content select="[footer]"></ng-content>
          @if (metric) {
            <div class="data-card__metric">
              <span class="data-card__metric-label">{{ metric.label }}</span>
              <span class="data-card__metric-value">{{ metric.value }}</span>
            </div>
          }
          
          @if (avatars && avatars.length > 0) {
            <div class="data-card__avatars">
              @for (avatar of avatars; track avatar.url) {
                <img [src]="avatar.url" class="data-card__avatar" [alt]="avatar.name">
              }
            </div>
          }
        </footer>
      }
    </article>
  `,
  styleUrls: ['./data-card.component.scss']
})
export class DataCardComponent {
  @Input({ required: true }) title!: string;
  @Input() status: string = '';
  // statusConfig defines the color variant: 'active' (default/success), 'inactive' (gray/closed), 'warning' (yellow)
  @Input() statusConfig: 'active' | 'inactive' | 'warning' = 'active';

  @Input() imageUrl?: string | null;
  @Input() details: DataCardDetail[] = [];

  @Input() metric?: DataCardMetric;
  @Input() avatars: DataCardAvatar[] = [];
  @Input() actions: ActionItem[] = [];

  @Output() actionClick = new EventEmitter<ActionItem>();
}
