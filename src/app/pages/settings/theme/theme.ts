import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeOption } from '../../../core/services/theme.service';
import { SlidingIndicator } from '../../../shared/sliding-indicator';

@Component({
  selector: 'app-theme',
  standalone: true,
  imports: [CommonModule, SlidingIndicator],
  templateUrl: './theme.html',
})
export class Theme {
  private themeService = inject(ThemeService);

  themeOptions: { value: ThemeOption; label: string; icon: string }[] = [
    { value: 'light', label: 'Claro', icon: 'pi-sun' },
    { value: 'dark', label: 'Oscuro', icon: 'pi-moon' },
    { value: 'system', label: 'Sistema', icon: 'pi-desktop' },
  ];

  currentTheme = this.themeService.theme;

  activeThemeIndex = computed(() =>
    Math.max(0, this.themeOptions.findIndex(o => o.value === this.currentTheme()))
  );

  setTheme(theme: ThemeOption): void {
    this.themeService.setTheme(theme);
  }
}