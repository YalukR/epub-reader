import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { SliderModule } from 'primeng/slider';
import { FormsModule } from '@angular/forms';
import { READER_FONTS } from '../../../core/services/epub-reader.service';

@Component({
  selector: 'app-reader-settings-drawer',
  standalone: true,
  imports: [DrawerModule, SliderModule, FormsModule],
  templateUrl: './reader-settings-drawer.html',
})
export class ReaderSettingsDrawer {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() fontSize = 100;
  @Output() fontSizeChange = new EventEmitter<number>();

  @Input() finished = false;
  @Output() finishedChange = new EventEmitter<boolean>();
  readonly fonts = READER_FONTS;

  @Input() fontId = 'original';
  @Output() fontIdChange = new EventEmitter<string>();

  @Input() lineHeight = 1.5;
  @Output() lineHeightChange = new EventEmitter<number>();

  @Input() margin = 16;
  @Output() marginChange = new EventEmitter<number>();

  decreaseLineHeight(): void {
    this.lineHeightChange.emit(Math.max(1.2, Math.round((this.lineHeight - 0.1) * 10) / 10));
  }
  increaseLineHeight(): void {
    this.lineHeightChange.emit(Math.min(2.2, Math.round((this.lineHeight + 0.1) * 10) / 10));
  }
  decreaseMargin(): void {
    this.marginChange.emit(Math.max(0, this.margin - 8));
  }
  increaseMargin(): void {
    this.marginChange.emit(Math.min(48, this.margin + 8));
  }

  onOpenChange(value: boolean): void {
    this.open = value;
    this.openChange.emit(value);
  }

  close(): void {
    this.onOpenChange(false);
  }

  increaseFontSize(): void {
    this.fontSizeChange.emit(Math.min(200, this.fontSize + 10));
  }

  decreaseFontSize(): void {
    this.fontSizeChange.emit(Math.max(70, this.fontSize - 10));
  }

  toggleFinished(): void {
    this.finishedChange.emit(!this.finished);
  }

  get currentFontCss(): string | null {
    return this.fonts.find((f) => f.id === this.fontId)?.css ?? null;
  }
}