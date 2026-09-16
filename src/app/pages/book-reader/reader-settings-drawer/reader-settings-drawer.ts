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
}