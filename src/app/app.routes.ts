import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'reader/:id',
    loadComponent: () =>
      import('./pages/book-reader/book-reader').then((m) => m.BookReader),
    data: { title: 'Lector' },
  },
];