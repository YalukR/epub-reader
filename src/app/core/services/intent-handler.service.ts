import { Injectable, NgZone, inject } from '@angular/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Router } from '@angular/router';
import { FileImportService } from './file-import.service';

@Injectable({ providedIn: 'root' })
export class IntentHandlerService {
  private router = inject(Router);
  private fileImportService = inject(FileImportService);
  private zone = inject(NgZone);
  private initialized = false;

  async init(): Promise<void> {
    console.log('[Intent] init() llamado');
    if (this.initialized) return;
    this.initialized = true;

    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('[Intent] appUrlOpen disparado:', event);
      this.zone.run(() => this.handleIncomingUri(event.url));
    });

    const launch = await App.getLaunchUrl();
    console.log('[Intent] getLaunchUrl devolvió:', launch);
    if (launch?.url) {
      await this.handleIncomingUri(launch.url);
    }
  }

  private async handleIncomingUri(uri: string): Promise<void> {
    console.log('[Intent] handleIncomingUri con:', uri);
    try {
      const book = await this.fileImportService.importFromUri(uri);
      console.log('[Intent] importFromUri OK:', book);
      this.zone.run(() => this.router.navigate(['/reader', book.id]));
    } catch (err) {
      console.error('[Intent] importFromUri FALLÓ:', err);
    }
  }
}