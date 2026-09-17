import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'books', pathMatch: 'full' },
  {
    path: 'books',
    loadComponent: () => import('./pages/books/books').then((m) => m.Books),
  },
  {
    path: 'reader/:id',
    loadComponent: () =>
      import('./pages/book-reader/book-reader').then((m) => m.BookReader),
    data: { title: 'Lector' },
  },
];