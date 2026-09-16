import { Component, input, output, inject } from '@angular/core';
import { Book } from '../../../core/models/database.model';
import { WarnDialogService } from '../../../core/services/warn-dialog.service';

export interface BookWithCover extends Book {
  coverSrc?: string | null;
}

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [],
  templateUrl: './book-card.html',
  styleUrl: './book-card.css',
})
export class BookCard {
  private warnDialog = inject(WarnDialogService);

  book = input.required<BookWithCover>();

  openBook = output<void>();
  deleteBook = output<void>();

  handleTap(): void {
    this.openBook.emit();
  }

  async onDelete(event: MouseEvent): Promise<void> {
    event.stopPropagation(); // evita que también dispare handleTap()

    const confirmed = await this.warnDialog.confirm({
      title: 'Borrar libro',
      message: `Se eliminará "${this.book().title}" de tu biblioteca. Esta acción no se puede deshacer.`,
      confirmLabel: 'Borrar',
      cancelLabel: 'Cancelar',
      danger: true,
    });

    if (confirmed) {
      this.deleteBook.emit();
    }
  }
}