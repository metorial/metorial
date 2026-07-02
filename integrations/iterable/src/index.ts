import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteUser,
  exportData,
  getChannels,
  getUser,
  manageCampaigns,
  manageCatalogs,
  manageLists,
  manageSnippets,
  manageTemplates,
  sendMessage,
  trackEvent,
  trackPurchase,
  updateCart,
  updateSubscriptions,
  upsertUser
} from './tools';
import { systemWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    upsertUser,
    getUser,
    deleteUser,
    trackEvent,
    trackPurchase,
    updateCart,
    manageLists,
    manageCampaigns,
    manageTemplates,
    manageCatalogs,
    manageSnippets,
    sendMessage,
    updateSubscriptions,
    getChannels,
    exportData
  ],
  triggers: [systemWebhook]
});
