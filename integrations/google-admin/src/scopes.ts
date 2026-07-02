import { anyOf } from 'slates';

export let googleAdminScopes = {
  adminDirectoryUser: 'https://www.googleapis.com/auth/admin.directory.user',
  adminDirectoryUserReadonly: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
  adminDirectoryUserAlias: 'https://www.googleapis.com/auth/admin.directory.user.alias',
  adminDirectoryUserAliasReadonly:
    'https://www.googleapis.com/auth/admin.directory.user.alias.readonly',
  adminDirectoryUserSecurity: 'https://www.googleapis.com/auth/admin.directory.user.security',
  adminDirectoryGroup: 'https://www.googleapis.com/auth/admin.directory.group',
  adminDirectoryGroupReadonly:
    'https://www.googleapis.com/auth/admin.directory.group.readonly',
  adminDirectoryGroupMember: 'https://www.googleapis.com/auth/admin.directory.group.member',
  adminDirectoryGroupMemberReadonly:
    'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
  appsGroupsSettings: 'https://www.googleapis.com/auth/apps.groups.settings',
  adminDirectoryOrgunit: 'https://www.googleapis.com/auth/admin.directory.orgunit',
  adminDirectoryOrgunitReadonly:
    'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
  adminDirectoryRolemanagement:
    'https://www.googleapis.com/auth/admin.directory.rolemanagement',
  adminDirectoryRolemanagementReadonly:
    'https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly',
  adminDirectoryDeviceChromeos:
    'https://www.googleapis.com/auth/admin.directory.device.chromeos',
  adminDirectoryDeviceChromeosReadonly:
    'https://www.googleapis.com/auth/admin.directory.device.chromeos.readonly',
  adminDirectoryDeviceMobile: 'https://www.googleapis.com/auth/admin.directory.device.mobile',
  adminDirectoryDeviceMobileReadonly:
    'https://www.googleapis.com/auth/admin.directory.device.mobile.readonly',
  adminDirectoryDomain: 'https://www.googleapis.com/auth/admin.directory.domain',
  adminDirectoryDomainReadonly:
    'https://www.googleapis.com/auth/admin.directory.domain.readonly',
  adminDirectoryCustomer: 'https://www.googleapis.com/auth/admin.directory.customer',
  adminDirectoryCustomerReadonly:
    'https://www.googleapis.com/auth/admin.directory.customer.readonly',
  adminDirectoryResourceCalendar:
    'https://www.googleapis.com/auth/admin.directory.resource.calendar',
  adminDirectoryResourceCalendarReadonly:
    'https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly',
  adminDirectoryUserschema: 'https://www.googleapis.com/auth/admin.directory.userschema',
  adminDirectoryUserschemaReadonly:
    'https://www.googleapis.com/auth/admin.directory.userschema.readonly',
  adminReportsAuditReadonly: 'https://www.googleapis.com/auth/admin.reports.audit.readonly',
  adminReportsUsageReadonly: 'https://www.googleapis.com/auth/admin.reports.usage.readonly',
  appsAlerts: 'https://www.googleapis.com/auth/apps.alerts',
  appsLicensing: 'https://www.googleapis.com/auth/apps.licensing',
  adminDatatransfer: 'https://www.googleapis.com/auth/admin.datatransfer',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

export let googleAdminActionScopes = {
  listUsers: anyOf(
    googleAdminScopes.adminDirectoryUser,
    googleAdminScopes.adminDirectoryUserReadonly
  ),
  getUser: anyOf(
    googleAdminScopes.adminDirectoryUser,
    googleAdminScopes.adminDirectoryUserReadonly
  ),
  createUser: anyOf(googleAdminScopes.adminDirectoryUser),
  updateUser: anyOf(googleAdminScopes.adminDirectoryUser),
  deleteUser: anyOf(googleAdminScopes.adminDirectoryUser),
  manageUserAliases: anyOf(
    googleAdminScopes.adminDirectoryUserAlias,
    googleAdminScopes.adminDirectoryUserAliasReadonly
  ),
  listGroups: anyOf(
    googleAdminScopes.adminDirectoryGroup,
    googleAdminScopes.adminDirectoryGroupReadonly
  ),
  manageGroup: anyOf(
    googleAdminScopes.adminDirectoryGroup,
    googleAdminScopes.adminDirectoryGroupReadonly
  ),
  manageGroupMembers: anyOf(
    googleAdminScopes.adminDirectoryGroupMember,
    googleAdminScopes.adminDirectoryGroupMemberReadonly
  ),
  manageOrgUnits: anyOf(
    googleAdminScopes.adminDirectoryOrgunit,
    googleAdminScopes.adminDirectoryOrgunitReadonly
  ),
  manageRoles: anyOf(
    googleAdminScopes.adminDirectoryRolemanagement,
    googleAdminScopes.adminDirectoryRolemanagementReadonly
  ),
  manageChromeosDevices: anyOf(
    googleAdminScopes.adminDirectoryDeviceChromeos,
    googleAdminScopes.adminDirectoryDeviceChromeosReadonly
  ),
  manageMobileDevices: anyOf(
    googleAdminScopes.adminDirectoryDeviceMobile,
    googleAdminScopes.adminDirectoryDeviceMobileReadonly
  ),
  manageDomains: anyOf(
    googleAdminScopes.adminDirectoryDomain,
    googleAdminScopes.adminDirectoryDomainReadonly
  ),
  getActivityReports: anyOf(googleAdminScopes.adminReportsAuditReadonly),
  getUsageReports: anyOf(googleAdminScopes.adminReportsUsageReadonly),
  manageAlerts: anyOf(googleAdminScopes.appsAlerts),
  manageCalendarResources: anyOf(
    googleAdminScopes.adminDirectoryResourceCalendar,
    googleAdminScopes.adminDirectoryResourceCalendarReadonly
  ),
  manageLicenses: anyOf(googleAdminScopes.appsLicensing),
  transferData: anyOf(googleAdminScopes.adminDatatransfer),
  getCustomerInfo: anyOf(
    googleAdminScopes.adminDirectoryCustomer,
    googleAdminScopes.adminDirectoryCustomerReadonly
  ),
  userChanges: anyOf(
    googleAdminScopes.adminDirectoryUser,
    googleAdminScopes.adminDirectoryUserReadonly
  ),
  activityEvents: anyOf(googleAdminScopes.adminReportsAuditReadonly)
} as const;
