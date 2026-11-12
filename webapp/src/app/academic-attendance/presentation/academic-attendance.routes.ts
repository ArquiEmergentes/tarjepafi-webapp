import { Routes } from '@angular/router';
import { PendingPhasePage } from '../../shared/presentation/pages/pending-phase/pending-phase';

export const TEACHER_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sessions' },
  { path: 'sessions', component: PendingPhasePage, data: { titleKey: 'nav.mySessions', phase: 4 } },
  { path: 'attendance', component: PendingPhasePage, data: { titleKey: 'nav.myAttendance', phase: 4 } },
  { path: 'meetings', component: PendingPhasePage, data: { titleKey: 'nav.myMeetings', phase: 4 } },
];
