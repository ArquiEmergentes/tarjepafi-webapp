import { Routes } from '@angular/router';
import { PendingPhasePage } from '../../shared/presentation/pages/pending-phase/pending-phase';

export const ACCESS_RECORDS_ROUTES: Routes = [
  { path: '', component: PendingPhasePage, data: { titleKey: 'nav.accessRecords', phase: 4 } },
];
