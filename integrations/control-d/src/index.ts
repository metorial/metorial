import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountInfo,
  getAnalyticsConfig,
  listDevices,
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
  manageRuleFolders,
  manageServices
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listProfiles,
    manageProfile,
    manageFilters,
    manageServices,
    manageCustomRules,
    manageRuleFolders,
    manageProfileOptions,
    manageDefaultRule,
    listDevices,
    manageDevice,
    manageIpAccess,
    listProxies,
    manageOrganization,
    getAnalyticsConfig,
    getAccountInfo
  ],
  triggers: [inboundWebhook]
});
