import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./views/dashboard/dashboard').then((m) => m.DashboardPage) },
];

export const REPORTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./views/report-list/report-list').then((m) => m.ReportListPage) },
  { path: ':reportId', loadComponent: () => import('./views/report-detail/report-detail').then((m) => m.ReportDetailPage) },
];
