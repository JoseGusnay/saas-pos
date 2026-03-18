import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="geist-spinner" [style.width.px]="size" [style.height.px]="size">
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
    </div>
  `,
  styles: [`
    .geist-spinner {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;

      .bar {
        position: absolute;
        width: 28%;
        height: 8%;
        left: 36%;
        top: 46%;
        background: currentColor;
        border-radius: 50px;
        animation: geist-spin 1.2s linear infinite;
        transform-origin: center;

        @for $i from 1 through 12 {
          &:nth-child(#{$i}) {
            transform: rotate(#{($i - 1) * 30}deg) translate(200%);
            animation-delay: #{($i - 13) * 100}ms;
          }
        }
      }
    }

    @keyframes geist-spin {
      0% { opacity: 1; }
      100% { opacity: 0.15; }
    }
  `]
})
export class SpinnerComponent {
  @Input() size = 16;
}
