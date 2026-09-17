import { ApplicationConfig, LOCALE_ID, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-MX';
import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { MessageService } from 'primeng/api';
import { Capacitor } from '@capacitor/core';
import { DatabaseService } from './core/services/database.service';

registerLocaleData(localeEs);

function initializeDatabase(dbService: DatabaseService) {
  return async () => {
    if (Capacitor.getPlatform() === 'web') {
      await customElements.whenDefined('jeep-sqlite');
    }
    await dbService.init().catch(() => {
      // el error ya quedó guardado en dbService.initError() para mostrarlo en UI
    });
  };
}

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      // Escala ámbar — modo CLARO (sin cambios)
      50: '#fbf3e7',
      100: '#f5e4c8',
      200: '#eccb96',
      300: '#e0ab64',
      400: '#cf8f4c',
      500: '#a8763f',
      600: '#8c6034',
      700: '#6f4b2a',
      800: '#523720',
      900: '#382616',
      950: '#241708',
    },
    colorScheme: {
      light: {
        /* sin cambios — surface tipo papel que ya tenías */
      },
      dark: {
        surface: {
          0: '#000000',
          50: '#18181a',   // fondo base
          100: '#1d1d1f',
          200: '#202022',  // hover
          300: '#2c2c2e',  // bordes/selección
          400: '#4a4a45',
          500: '#8a8a7c',  // texto apagado (tono comentario)
          600: '#a6a698',
          700: '#c2c2b6',
          800: '#dedecd',
          900: '#d8d8d4',  // texto principal (blanco hueso)
          950: '#f2f2ea',
        },
        primary: {
          color: '#5fd3e8',
          contrastColor: '#18181a',
          hoverColor: '#7ddcee',
          activeColor: '#4bc3d8',
        },
      },
    },
  },
});

// Direcciones posibles del slide, elegidas al azar en cada navegación
const SLIDE_DIRECTIONS = ['slide-left', 'slide-right', 'slide-up', 'slide-down'] as const;



export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions({
        onViewTransitionCreated: ({ transition }) => {
          const direction =
            SLIDE_DIRECTIONS[Math.floor(Math.random() * SLIDE_DIRECTIONS.length)];

          document.documentElement.setAttribute('data-transition', direction);

          transition.finished.finally(() => {
            document.documentElement.removeAttribute('data-transition');
          });
        },
      })
    ),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeDatabase,
      deps: [DatabaseService],
      multi: true,
    },
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: '.dark',
        },
      },
    }),

    MessageService,
  ],
};