import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
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
}