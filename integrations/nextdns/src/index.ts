import { Slate } from 'slates';
import { spec } from './spec';
import {
  clearLogs,
  createProfile,
  deleteProfile,
  getAnalytics,
  getLogs,
  getProfile,
  getSetup,
  listProfiles,
  manageAllowlistDenylist,
  manageRewrites,
  updateParentalControl,
  updatePrivacy,
  updateSecurity,
  updateSettings
} from './tools';
import { dnsQueryLog, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProfiles,
    getProfile,
    createProfile,
    deleteProfile,
    updateSecurity,
    updatePrivacy,
    updateParentalControl,
    manageAllowlistDenylist,
    manageRewrites,
    updateSettings,
    getAnalytics,
    getLogs,
    clearLogs,
    getSetup
  ],
  triggers: [inboundWebhook, dnsQueryLog]
});
