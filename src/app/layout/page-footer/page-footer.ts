import { Component, inject, ChangeDetectionStrategy, ElementRef, ViewChild, effect } from '@angular/core';
import { PageTitleService } from '../../core/services/page-title.service';

@Component({
  selector: 'app-page-footer',
  standalone: true,
  imports: [],
  templateUrl: './page-footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageFooter {
  private pageTitleService = inject(PageTitleService);

  footer = this.pageTitleService.footer;

  @ViewChild('scroller') private scrollerRef?: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      const f = this.footer();
      if (!f?.isCarouselOpen) return;
      const index = f.currentPageIndex;
      queueMicrotask(() => this.scrollToIndex(index));
    });
  }

  private scrollToIndex(index: number): void {
    const root = this.scrollerRef?.nativeElement;
    if (!root || index < 0) return;
    const el = root.querySelector(`[data-index="${index}"]`) as HTMLElement | null;
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
}