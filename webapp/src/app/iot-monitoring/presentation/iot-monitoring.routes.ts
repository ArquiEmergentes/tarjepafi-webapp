import { Routes } from '@angular/router';
import { PendingPhasePage } from '../../shared/presentation/pages/pending-phase/pending-phase';

export const READERS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./views/reader-list/reader-list').then((m) => m.ReaderListPage) },
  { path: ':readerId', loadComponent: () => import('./views/reader-detail/reader-detail').then((m) => m.ReaderDetailPage) },
];

export const SIMULATOR_ROUTES: Routes = [
  { path: '', component: PendingPhasePage, data: { titleKey: 'nav.simulator', phase: 4 } },
];
