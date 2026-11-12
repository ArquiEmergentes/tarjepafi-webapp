import { SessionRole } from '../../application/session.port';

export interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
  /** Coincidencia exacta de ruta para marcar el ítem activo. */
  exact?: boolean;
}

export interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const PROFILE: NavItem = { labelKey: 'nav.profile', icon: 'account_circle', route: '/profile' };

export const NAVIGATION: Record<SessionRole, NavSection[]> = {
  ADMIN: [
    {
      titleKey: 'nav.sections.overview',
      items: [{ labelKey: 'nav.dashboard', icon: 'dashboard', route: '/admin/dashboard' }],
    },
    {
      titleKey: 'nav.sections.credentials',
      items: [
        { labelKey: 'nav.credentials', icon: 'badge', route: '/admin/credentials', exact: false },
        { labelKey: 'nav.enrollmentCheck', icon: 'fact_check', route: '/admin/enrollment-check' },
      ],
    },
    {
      titleKey: 'nav.sections.iot',
      items: [
        { labelKey: 'nav.readers', icon: 'sensors', route: '/admin/readers' },
        { labelKey: 'nav.simulator', icon: 'contactless', route: '/admin/simulator' },
        { labelKey: 'nav.accessRecords', icon: 'door_open', route: '/admin/access-records' },
      ],
    },
    {
      titleKey: 'nav.sections.data',
      items: [{ labelKey: 'nav.reports', icon: 'bar_chart', route: '/admin/reports' }],
    },
  ],
  TEACHER: [
    {
      titleKey: 'nav.sections.teaching',
      items: [
        { labelKey: 'nav.mySessions', icon: 'event', route: '/teacher/sessions' },
        { labelKey: 'nav.myAttendance', icon: 'history', route: '/teacher/attendance' },
        { labelKey: 'nav.myMeetings', icon: 'groups', route: '/teacher/meetings' },
      ],
    },
    { titleKey: 'nav.sections.account', items: [PROFILE] },
  ],
  STUDENT: [
    { titleKey: 'nav.sections.portal', items: [{ labelKey: 'nav.comingSoon', icon: 'hourglass_top', route: '/coming-soon' }] },
    { titleKey: 'nav.sections.account', items: [PROFILE] },
  ],
  STAFF: [
    { titleKey: 'nav.sections.portal', items: [{ labelKey: 'nav.comingSoon', icon: 'hourglass_top', route: '/coming-soon' }] },
    { titleKey: 'nav.sections.account', items: [PROFILE] },
  ],
};

export const HOME_BY_ROLE: Record<SessionRole, string> = {
  ADMIN: '/admin/dashboard',
  TEACHER: '/teacher/sessions',
  STUDENT: '/coming-soon',
  STAFF: '/coming-soon',
};
