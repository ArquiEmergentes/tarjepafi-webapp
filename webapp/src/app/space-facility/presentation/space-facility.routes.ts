import { Routes } from '@angular/router';

export const ACCESS_RECORDS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./views/access-records/access-records').then((m) => m.AccessRecordsPage) },
];
