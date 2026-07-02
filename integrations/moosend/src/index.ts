import { Slate } from 'slates';
import { spec } from './spec';
import {
  campaignAnalytics,
  createCampaign,
  deleteCampaign,
  getCampaigns,
  listSubscribers,
  manageCustomField,
  manageMailingList,
  manageSegment,
  manageSubscriber,
  sendCampaign,
  sendTransactionalEmail,
  updateCampaign
} from './tools';
import { campaignSent, inboundWebhook, newSubscriber } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createCampaign,
    getCampaigns,
    sendCampaign,
    updateCampaign,
    deleteCampaign,
    campaignAnalytics,
    manageMailingList,
    manageSubscriber,
    listSubscribers,
    manageCustomField,
    manageSegment,
    sendTransactionalEmail
  ],
  triggers: [inboundWebhook, newSubscriber, campaignSent]
});
