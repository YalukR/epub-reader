import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-sliding-indicator',
  standalone: true,
  template: `
    <div
      class="indicator-track"
      [style.width.%]="100 / count()"
      [style.transform]="transform()"
      [class.is-hidden]="!isVisible()">
      <div class="indicator-shape" [class]="shapeClass()"></div>
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }
    .indicator-track {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 200ms ease-out,
                  scale 200ms ease-out;
      will-change: transform;
    }
    .indicator-track.is-hidden {
      opacity: 0;
      scale: 0.8;
    }
    :where(.indicator-shape) {
      width: 100%;
      height: 100%;
      flex-shrink: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlidingIndicator {
  count = input.required<number>();
  activeIndex = input.required<number>();
  shapeClass = input<string>('');

  isVisible = computed(() => this.activeIndex() >= 0);

  transform = computed(() => {
    const idx = Math.max(0, this.activeIndex());
    return `translateX(${idx * 100}%)`;
  });
}