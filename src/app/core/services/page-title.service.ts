import { Injectable, signal } from '@angular/core';

export interface HeaderAction {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}

export interface FooterProgress {
  percentage: number;
  onPrev: () => void;
  onNext: () => void;
  isCarouselOpen: boolean;
  onToggleCarousel: () => void;
  pageCfis: string[];
  currentPageIndex: number;
  onPageSelected: (index: number) => void;
}

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private _override = signal<string | null>(null);
  override = this._override.asReadonly();

  private _showBack = signal(false);
  showBack = this._showBack.asReadonly();

  private _actions = signal<HeaderAction[]>([]);
  actions = this._actions.asReadonly();

  // Nulo = footer oculto (comportamiento por defecto en todas las páginas).
  // Solo el reader lo rellena mientras está montado.
  private _footer = signal<FooterProgress | null>(null);
  footer = this._footer.asReadonly();

  setTitle(title: string): void {
    this._override.set(title);
  }

  enableBack(): void {
    this._showBack.set(true);
  }

  setActions(actions: HeaderAction[]): void {
    this._actions.set(actions);
  }

  setFooter(footer: FooterProgress | null): void {
    this._footer.set(footer);
  }

  clear(): void {
    this._override.set(null);
    this._showBack.set(false);
    this._actions.set([]);
    this._footer.set(null);
  }
}