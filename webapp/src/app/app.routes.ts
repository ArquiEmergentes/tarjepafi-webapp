import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeRedirectGuard, roleGuard } from './iam/application/guards';
import { Shell } from './shared/presentation/layout/shell/shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'TarjePAFI · Iniciar sesión',
    loadComponent: () => import('./iam/presentation/views/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      {
        path: 'admin',
        canActivate: [roleGuard('ADMIN')],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadChildren: () => import('./data-management/presentation/data-management.routes').then((m) => m.DASHBOARD_ROUTES),
          },
          {
            path: 'credentials',
            loadChildren: () => import('./credentials/presentation/credentials.routes').then((m) => m.CREDENTIALS_ROUTES),
          },
          {
            path: 'enrollment-check',
            loadChildren: () => import('./credentials/presentation/credentials.routes').then((m) => m.ENROLLMENT_CHECK_ROUTES),
          },
          {
            path: 'readers',
            loadChildren: () => import('./iot-monitoring/presentation/iot-monitoring.routes').then((m) => m.READERS_ROUTES),
          },
          {
            path: 'simulator',
            loadChildren: () => import('./iot-monitoring/presentation/iot-monitoring.routes').then((m) => m.SIMULATOR_ROUTES),
          },
          {
            path: 'access-records',
            loadChildren: () => import('./space-facility/presentation/space-facility.routes').then((m) => m.ACCESS_RECORDS_ROUTES),
          },
          {
            path: 'reports',
            loadChildren: () => import('./data-management/presentation/data-management.routes').then((m) => m.REPORTS_ROUTES),
          },
        ],
      },
      {
        path: 'teacher',
        canActivate: [roleGuard('TEACHER')],
        loadChildren: () => import('./academic-attendance/presentation/academic-attendance.routes').then((m) => m.TEACHER_ROUTES),
      },
      {
        path: 'coming-soon',
        canActivate: [roleGuard('STUDENT', 'STAFF')],
        loadComponent: () => import('./shared/presentation/pages/coming-soon/coming-soon').then((m) => m.ComingSoonPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./iam/presentation/views/profile/profile').then((m) => m.ProfilePage),
      },
      {
        path: 'access-denied',
        loadComponent: () => import('./shared/presentation/pages/access-denied/access-denied').then((m) => m.AccessDeniedPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
