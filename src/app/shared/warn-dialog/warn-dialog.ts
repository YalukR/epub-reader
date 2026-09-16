import { Component, inject } from '@angular/core';
import { WarnDialogService } from '../../core/services/warn-dialog.service';

@Component({
  selector: 'app-warn-dialog',
  imports: [],
  templateUrl: './warn-dialog.html',
  styleUrl: './warn-dialog.css',
})
export class WarnDialog {
  private service = inject(WarnDialogService);

  pending = this.service.pending;

  confirm(): void {
    this.service.respond(true);
  }

  cancel(): void {
    this.service.respond(false);
  }
}