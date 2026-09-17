import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { SliderModule } from 'primeng/slider';
import { FormsModule } from '@angular/forms';

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
}