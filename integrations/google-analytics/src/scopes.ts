import { allOf, anyOf } from 'slates';

export let googleAnalyticsScopes = {
  analyticsReadonly: 'https://www.googleapis.com/auth/analytics.readonly',
  analyticsEdit: 'https://www.googleapis.com/auth/analytics.edit',
  analyticsManageUsers: 'https://www.googleapis.com/auth/analytics.manage.users',
  analyticsManageUsersReadonly:
    'https://www.googleapis.com/auth/analytics.manage.users.readonly',
  openIdEmailProfile: 'openid email profile'
} as const;

let analyticsDataRead = anyOf(
  googleAnalyticsScopes.analyticsReadonly,
  googleAnalyticsScopes.analyticsEdit
);

let analyticsAdminWrite = anyOf(googleAnalyticsScopes.analyticsEdit);

export let googleAnalyticsActionScopes = {
  runReport: allOf(analyticsDataRead),
  runRealtimeReport: analyticsDataRead,
  runFunnelReport: analyticsDataRead,
  getMetadata: analyticsDataRead,
  listAccountsAndProperties: analyticsDataRead,
  auditDataAccess: analyticsDataRead,
  manageDataStreams: analyticsAdminWrite,
  manageCustomDimensions: analyticsAdminWrite,
  manageCustomMetrics: analyticsAdminWrite,
  manageKeyEvents: analyticsAdminWrite,
  manageAudiences: analyticsAdminWrite,
  propertyChange: analyticsAdminWrite
} as const;
