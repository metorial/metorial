import { Slate } from 'slates';
import { spec } from './spec';
import {
  addOrUpdateSubscriber,
  getCampaignReport,
  getCampaigns,
  getCustomFields,
  getListSubscribers,
  getLists,
  getSubscriber,
  getUnsubscribed,
  importSubscribers,
  manageCampaigns,
  manageCustomFields,
  manageLists,
  removeSubscriber
} from './tools';
import {
  campaignStatusChange,
  inboundWebhook,
  newSubscriber,
  newUnsubscribe
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getLists,
    manageLists,
    getSubscriber,
    getListSubscribers,
    addOrUpdateSubscriber,
    removeSubscriber,
    importSubscribers,
    getCustomFields,
    manageCustomFields,
    getCampaigns,
    manageCampaigns,
    getCampaignReport,
    getUnsubscribed
  ],
  triggers: [inboundWebhook, newSubscriber, newUnsubscribe, campaignStatusChange]
});
