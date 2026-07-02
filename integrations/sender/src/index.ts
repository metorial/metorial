import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createSubscriber,
  deleteSubscribers,
  getCampaignStatistics,
  getSubscriber,
  listCampaigns,
  listGroups,
  listSegments,
  listSubscribers,
  manageGroup,
  manageSubscriberGroups,
  sendTransactionalEmail,
  startWorkflow,
  updateSubscriber
} from './tools';
import { campaignEvents, groupEvents, subscriberEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createSubscriber,
    updateSubscriber,
    getSubscriber,
    deleteSubscribers,
    listSubscribers,
    manageSubscriberGroups,
    manageGroup,
    listGroups,
    createCampaign,
    listCampaigns,
    sendTransactionalEmail,
    startWorkflow,
    listSegments,
    getCampaignStatistics
  ],
  triggers: [subscriberEvents, campaignEvents, groupEvents]
});
