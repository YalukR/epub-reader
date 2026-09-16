import { Component, inject, computed } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageTitleService } from '../../core/services/page-title.service';
import { ThemeService } from '../../core/services/theme.service';

interface HeaderIcon {
  path: string;
  icon: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader {
  private router = inject(Router);
  private location = inject(Location);
  private pageTitleService = inject(PageTitleService);
  private themeService = inject(ThemeService);

  icons: HeaderIcon[] = this.router.config
    .filter(route => route.data?.['headerIcon'])
    .map(route => ({
      path: `/${route.path}`,
      icon: route.data!['headerIcon'],
    }));

  private titleMap = new Map<string, string>(
    this.router.config
      .filter(route => route.data?.['title'])
      .map(route => [`/${route.path}`, route.data!['title'] as string])
  );

  private activeUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  title = computed(() => this.pageTitleService.override() ?? this.titleMap.get(this.activeUrl()) ?? '');

  /** Solo se muestra la flecha si la página activa la habilitó */
  backPath = computed(() => (this.pageTitleService.showBack() ? true : null));

  actions = computed(() => this.pageTitleService.actions());

  isDark = this.themeService.isDark;

  goBack(): void {
    // Location.back() usa el historial real del navegador/Capacitor,
    // así el destino se resuelve solo — sin que ninguna página tenga que "saber" a dónde volver.
    this.location.back();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}