import type { UserRole } from '@/lib/authClient';

export const ROUTE_ROLE_ACCESS: Partial<Record<string, UserRole[]>> = {
  '/': ['ADMIN', 'ENGINEER', 'COMPETITOR'],
  '/engineering': ['ADMIN', 'ENGINEER', 'COMPETITOR'],
  '/live': ['ADMIN', 'DIRECTOR', 'ENGINEER', 'COMPETITOR'],
  '/overview-director': ['ADMIN', 'DIRECTOR', 'ENGINEER', 'COMPETITOR'],
  '/director': ['ADMIN', 'DIRECTOR', 'ENGINEER', 'COMPETITOR'],
  '/report': ['ADMIN', 'DIRECTOR', 'ENGINEER', 'COMPETITOR'],
  '/files': ['ADMIN', 'DIRECTOR', 'ENGINEER', 'COMPETITOR'],
  '/settings': ['ADMIN', 'ENGINEER', 'COMPETITOR'],
  '/task': [],
  '/chat': [],
  '/administration': ['ADMIN', 'ENGINEER', 'COMPETITOR'],
};

const NAV_LABELS: Array<{ href: string; label: string }> = [
  { href: '/', label: 'All Sensors' },
  { href: '/engineering', label: 'Engineering' },
  { href: '/live', label: 'Live Stream' },
  { href: '/overview-director', label: 'Overview Director' },
  { href: '/director', label: 'Director Graph' },
  { href: '/report', label: 'Report' },
  { href: '/files', label: 'Video' },
  { href: '/administration', label: 'Administration' },
  { href: '/settings', label: 'Settings' },
];

export function getDefaultLandingPage(role: UserRole) {
  if (role === 'ADMIN') return '/administration';
  if (role === 'DIRECTOR') return '/overview-director';
  return '/engineering';
}

export function canAccessRoute(route: string, role: UserRole) {
  const allowedRoles = ROUTE_ROLE_ACCESS[route];
  return !allowedRoles || allowedRoles.includes(role);
}

export function getAccessibleNavigationLabels(role: UserRole) {
  return NAV_LABELS.filter((item) => canAccessRoute(item.href, role)).map(
    (item) => item.label
  );
}

export function canEditLayouts(role: UserRole) {
  return role === 'ADMIN' || role === 'ENGINEER';
}
