import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUser,
  deleteUser,
  getActivityReports,
  getCustomerInfo,
  getUsageReports,
  getUser,
  listGroups,
  listUsers,
  // manageAlerts,
  manageCalendarResources,
  manageChromeOsDevices,
  manageDomains,
  manageGroup,
  manageGroupMembers,
  manageLicenses,
  manageMobileDevices,
  manageOrgUnits,
  manageRoles,
  manageUserAliases,
  transferData,
  updateUser
} from './tools';
import { activityEvents, userChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    manageUserAliases,
    listGroups,
    manageGroup,
    manageGroupMembers,
    manageOrgUnits,
    manageRoles,
    manageChromeOsDevices,
    manageMobileDevices,
    manageDomains,
    getActivityReports,
    getUsageReports,
    // manage_alerts is intentionally not registered. The Alert Center API only supports
    // service accounts with domain-wide delegation, and Google rejects its apps.alerts scope
    // as invalid for a user OAuth client, so the tool can never succeed through this
    // integration's OAuth method. The implementation is kept in tools/manage-alerts.ts for a
    // future service-account auth method.
    // manageAlerts,
    manageCalendarResources,
    manageLicenses,
    transferData,
    getCustomerInfo
  ],
  triggers: [userChanges, activityEvents]
});
