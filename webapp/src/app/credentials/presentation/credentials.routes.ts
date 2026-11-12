import { Routes } from '@angular/router';
import { PendingPhasePage } from '../../shared/presentation/pages/pending-phase/pending-phase';

export const CREDENTIALS_ROUTES: Routes = [
  { path: '', component: PendingPhasePage, data: { titleKey: 'nav.credentials', phase: 2 } },
];

export const ENROLLMENT_CHECK_ROUTES: Routes = [
  { path: '', component: PendingPhasePage, data: { titleKey: 'nav.enrollmentCheck', phase: 2 } },
];
