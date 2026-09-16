import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { NavItem } from 'epubjs';
import { Bookmark } from '../../../core/models/database.model';

@Component({
  selector: 'app-reader-toc-drawer',
  standalone: true,
  imports: [DrawerModule],
  templateUrl: './reader-toc-drawer.html',
})
export class ReaderTocDrawer {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() toc: NavItem[] = [];
  @Input() bookmarks: Bookmark[] = [];

  @Output() tocItemSelected = new EventEmitter<NavItem>();
  @Output() bookmarkSelected = new EventEmitter<Bookmark>();

  onOpenChange(value: boolean): void {
    this.open = value;
    this.openChange.emit(value);
  }

  close(): void {
    this.onOpenChange(false);
  }
}