import { Routes } from '@angular/router';

export const CREDENTIALS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./views/credential-list/credential-list').then((m) => m.CredentialListPage) },
  {
    path: ':credentialId',
    loadComponent: () => import('./views/credential-detail/credential-detail').then((m) => m.CredentialDetailPage),
  },
];

export const ENROLLMENT_CHECK_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./views/enrollment-check/enrollment-check').then((m) => m.EnrollmentCheckPage) },
];
