import { Injectable, signal } from '@angular/core';

export const IMMERSIVE_DURATION_MS = 280;

@Injectable({ providedIn: 'root' })
export class ImmersiveService {
  private _active = signal(false);
  readonly active = this._active.asReadonly();

  private _animating = signal(false);
  readonly animating = this._animating.asReadonly();

  private timer?: ReturnType<typeof setTimeout>;

  toggle(): void {
    this.set(!this._active());
  }

  set(value: boolean): void {
    if (value === this._active()) return;
    this._active.set(value);
    this._animating.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this._animating.set(false),
      IMMERSIVE_DURATION_MS + 20
    );
  }
}