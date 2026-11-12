import { Routes } from '@angular/router';

export const READERS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./views/reader-list/reader-list').then((m) => m.ReaderListPage) },
  { path: ':readerId', loadComponent: () => import('./views/reader-detail/reader-detail').then((m) => m.ReaderDetailPage) },
];

export const SIMULATOR_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./views/simulator/simulator').then((m) => m.SimulatorPage) },
];
