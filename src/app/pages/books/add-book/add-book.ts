import { Component, ViewChild, ElementRef, output, signal } from '@angular/core';
import { FileImportService } from '../../../core/services/file-import.service';

@Component({
  selector: 'app-add-book',
  standalone: true,
  imports: [],
  templateUrl: './add-book.html',
  styleUrl: './add-book.css',
})
export class AddBook {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private _isImporting = signal(false);
  isImporting = this._isImporting.asReadonly();

  imported = output<void>();
  importError = output<string>();

  constructor(private fileImportService: FileImportService) {}

  triggerFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite reimportar el mismo archivo dos veces seguidas
    if (!file) return;

    this._isImporting.set(true);

    try {
      await this.fileImportService.importEpubFile(file);
      this.imported.emit();
    } catch (err) {
      console.error('Error al importar el EPUB:', err);
      this.importError.emit('No se pudo importar el archivo. ¿Seguro que es un .epub válido?');
    } finally {
      this._isImporting.set(false);
    }
  }
}