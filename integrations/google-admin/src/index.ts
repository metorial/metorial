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
  manageAlerts,
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
    manageAlerts,
    manageCalendarResources,
    manageLicenses,
    transferData,
    getCustomerInfo
  ],
  triggers: [userChanges, activityEvents]
});
