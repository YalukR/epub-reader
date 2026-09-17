import { Injectable } from '@angular/core';
import { Book } from 'epubjs';

/**
 * Expone el mapeo entre CFIs y números de página (basado en las
 * locations generadas por EpubReaderService.generateLocations()).
 * Requiere que EpubReaderService llame a attach()/detach() cuando
 * abre/cierra un libro.
 */
@Injectable({ providedIn: 'root' })
export class EpubPageThumbnailsService {
  private book?: Book;

  attach(book: Book): void {
    this.book = book;
  }

  detach(): void {
    this.book = undefined;
  }

  /** Requiere que book.locations.generate() ya se haya ejecutado. */
  getPageCfis(): string[] {
    const total = this.book?.locations?.length() ?? 0;
    const cfis: string[] = [];
    for (let i = 0; i < total; i++) {
      cfis.push(this.book!.locations.cfiFromLocation(i));
    }
    return cfis;
  }

  getLocationIndexForCfi(cfi: string): number {
    const location = this.book?.locations?.locationFromCfi(cfi);
    return location != null ? Number(location) : -1;
  }
}