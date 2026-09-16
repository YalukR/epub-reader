import { Component, ViewChild, ElementRef, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FileImportService } from '../../../core/services/file-import.service';

@Component({
  selector: 'app-add-book',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './add-book.html',
  styleUrl: './add-book.css',
})
export class AddBook {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isImporting = false;
  errorMessage: string | null = null;

  imported = output<void>();

  constructor(private fileImportService: FileImportService) {}

  triggerFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite reimportar el mismo archivo dos veces seguidas
    if (!file) return;

    this.isImporting = true;
    this.errorMessage = null;

    try {
      await this.fileImportService.importEpubFile(file);
      this.imported.emit();
    } catch (err) {
      console.error('Error al importar el EPUB:', err);
      this.errorMessage = 'No se pudo importar el archivo. ¿Seguro que es un .epub válido?';
    } finally {
      this.isImporting = false;
    }
  }
}