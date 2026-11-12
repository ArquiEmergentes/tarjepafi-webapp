import { Routes } from '@angular/router';
import { PendingPhasePage } from '../../shared/presentation/pages/pending-phase/pending-phase';

export const DASHBOARD_ROUTES: Routes = [
  { path: '', component: PendingPhasePage, data: { titleKey: 'nav.dashboard', phase: 5 } },
];

export const REPORTS_ROUTES: Routes = [
  { path: '', component: PendingPhasePage, data: { titleKey: 'nav.reports', phase: 5 } },
];
