import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountInfo,
  getAnalyticsConfig,
  listDevices,
  listProfileRestrictions,
  listProfiles,
  listProxies,
  manageCustomRules,
  manageDefaultRule,
  manageDevice,
  manageFilters,
  manageIpAccess,
  manageOrganization,
  manageProfile,
  manageProfileOptions,
  manageProfileRestrictions,
  manageRuleFolders,
  manageServices
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listProfiles,
    listProfileRestrictions,
    manageProfile,
    manageFilters,
    manageServices,
    manageCustomRules,
    manageRuleFolders,
    manageProfileOptions,
    manageProfileRestrictions,
    manageDefaultRule,
    listDevices,
    manageDevice,
    manageIpAccess,
    listProxies,
    manageOrganization,
    getAnalyticsConfig,
    getAccountInfo
  ],
  triggers: []
});
