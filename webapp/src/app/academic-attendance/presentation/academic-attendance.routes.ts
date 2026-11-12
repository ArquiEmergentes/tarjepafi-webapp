import { Routes } from '@angular/router';

export const TEACHER_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sessions' },
  { path: 'sessions', loadComponent: () => import('./views/my-sessions/my-sessions').then((m) => m.MySessionsPage) },
  {
    path: 'sessions/:sessionId',
    loadComponent: () => import('./views/session-detail/session-detail').then((m) => m.SessionDetailPage),
  },
  { path: 'attendance', loadComponent: () => import('./views/my-attendance/my-attendance').then((m) => m.MyAttendancePage) },
  { path: 'meetings', loadComponent: () => import('./views/my-meetings/my-meetings').then((m) => m.MyMeetingsPage) },
];
