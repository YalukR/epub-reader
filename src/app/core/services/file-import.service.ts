import { Injectable } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import ePub from 'epubjs';
import { BookService } from './book.service';
import { Book } from '../models/database.model';

@Injectable({ providedIn: 'root' })
export class FileImportService {
  private readonly BOOKS_DIR = 'books';

  constructor(private bookService: BookService) { }

  /**
   * Recibe un File (por ejemplo desde un <input type="file"> o el resultado
   * de un file-picker nativo), lo copia a almacenamiento persistente y
   * crea el registro correspondiente en la tabla `books`.
   * Devuelve el id del libro recién insertado.
   */
  async importEpubFile(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer();
    const fallbackTitle = file.name.replace(/\.epub$/i, '');
    const book = await this.importFromArrayBuffer(arrayBuffer, fallbackTitle, file.size);
    return book.id!;
  }

  /**
   * Recibe una URI de contenido externa (content:// desde WhatsApp, Gmail,
   * un explorador de archivos, etc. — llega vía appUrlOpen/getLaunchUrl),
   * lee sus bytes y sigue el mismo flujo de importación que el picker manual.
   * Devuelve el Book completo (con id) para poder navegar directo al reader.
   */
  async importFromUri(uri: string): Promise<Book> {
    // Sin `directory`: Filesystem resuelve la URI completa (content:// o file://)
    // en vez de buscarla dentro de un directorio propio de la app.
    const { data } = await Filesystem.readFile({ path: uri });
    const arrayBuffer = base64ToArrayBuffer(data as string);
    return this.importFromArrayBuffer(arrayBuffer, 'Libro compartido');
  }

  /** Lógica común: guarda el epub, extrae metadata/portada y crea el registro en DB. */
  private async importFromArrayBuffer(
    arrayBuffer: ArrayBuffer,
    fallbackTitle: string,
    fileSize?: number
  ): Promise<Book> {
    const base64Data = arrayBufferToBase64(arrayBuffer);
    const fileName = `${crypto.randomUUID()}.epub`;
    const relativePath = `${this.BOOKS_DIR}/${fileName}`;

    await this.ensureBooksDir();
    await Filesystem.writeFile({
      path: relativePath,
      data: base64Data,
      directory: Directory.Data,
    });

    const { title, author, coverUrl } = await this.extractMetadata(arrayBuffer);

    let coverPath: string | undefined;
    if (coverUrl) {
      coverPath = await this.saveCover(coverUrl, fileName);
    }

    const book: Book = {
      title: title || fallbackTitle,
      author,
      coverPath,
      filePath: relativePath,
      fileSize: fileSize ?? arrayBuffer.byteLength,
      addedAt: Date.now(),
    };

    const id = await this.bookService.addBook(book);
    return { ...book, id };
  }

  /** Lee el .epub ya guardado y devuelve sus bytes, listos para EpubReaderService.open(). */
  async readEpubBytes(relativePath: string): Promise<ArrayBuffer> {
    const result = await Filesystem.readFile({
      path: relativePath,
      directory: Directory.Data,
    });
    return base64ToArrayBuffer(result.data as string);
  }

  async deleteEpubFile(relativePath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: relativePath, directory: Directory.Data });
    } catch {
      // Si ya no existe, no es un error real para nuestros efectos.
    }
  }

  private async ensureBooksDir(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: this.BOOKS_DIR,
        directory: Directory.Data,
        recursive: true,
      });
    } catch {
      // Ya existe: mkdir lanza error si la carpeta está creada, lo ignoramos.
    }
  }

  private async extractMetadata(
    arrayBuffer: ArrayBuffer
  ): Promise<{ title: string; author: string; coverUrl: string | null }> {
    const book = ePub(arrayBuffer.slice(0));
    await book.ready;

    const metadata = await book.loaded.metadata;
    let coverUrl: string | null = null;
    try {
      coverUrl = await book.coverUrl();
    } catch {
      coverUrl = null;
    }
    return { title: metadata.title, author: metadata.creator, coverUrl };
  }

  private async saveCover(coverBlobUrl: string, epubFileName: string): Promise<string> {
    const response = await fetch(coverBlobUrl);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    const ext = mimeToExtension(blob.type);

    const coverFileName = epubFileName.replace(/\.epub$/i, `.${ext}`);
    const relativePath = `${this.BOOKS_DIR}/${coverFileName}`;

    await Filesystem.writeFile({ path: relativePath, data: base64, directory: Directory.Data });
    URL.revokeObjectURL(coverBlobUrl);

    return relativePath;
  }

  async getCoverSrc(coverPath?: string): Promise<string | null> {
    if (!coverPath) return null;

    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.getUri({ path: coverPath, directory: Directory.Data });
      return Capacitor.convertFileSrc(uri);
    }

    try {
      const result = await Filesystem.readFile({ path: coverPath, directory: Directory.Data });
      const ext = coverPath.split('.').pop()?.toLowerCase();
      const mime = extensionToMime(ext);
      return `data:${mime};base64,${result.data}`;
    } catch {
      return null;
    }
  }
}

// ── Helpers de conversión (sin cambios) ──────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function mimeToExtension(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    default: return 'jpg';
  }
}

function extensionToMime(ext?: string): string {
  switch (ext) {
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'jpg':
    case 'jpeg':
    default: return 'image/jpeg';
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}