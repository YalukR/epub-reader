import { Component, signal, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { ToastModule } from 'primeng/toast';
import { PageHeader } from './layout/page-header/page-header';
import { PageFooter } from './layout/page-footer/page-footer';
import { MessageService } from 'primeng/api';
import { WarnDialog } from './shared/warn-dialog/warn-dialog';
import { DatabaseService } from './core/services/database.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, PageHeader, PageFooter, WarnDialog],
  providers: [MessageService],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private router = inject(Router);
  databaseService = inject(DatabaseService);
  protected readonly title = signal('mood-tracker');

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  showChrome = computed(() => {
    const url = this.currentUrl();
    return !url.startsWith('/setup') && !url.startsWith('/lock');
  });


  async ngOnInit(): Promise<void> { }

}