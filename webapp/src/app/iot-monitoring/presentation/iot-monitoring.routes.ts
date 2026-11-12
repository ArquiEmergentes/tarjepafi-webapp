import { Routes } from '@angular/router';
import { PendingPhasePage } from '../../shared/presentation/pages/pending-phase/pending-phase';

export const READERS_ROUTES: Routes = [
  { path: '', component: PendingPhasePage, data: { titleKey: 'nav.readers', phase: 3 } },
];

export const SIMULATOR_ROUTES: Routes = [
  { path: '', component: PendingPhasePage, data: { titleKey: 'nav.simulator', phase: 4 } },
];
