import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createOrUpdateSubscriber,
  deleteCampaign,
  deleteSubscriber,
  getCampaignReport,
  getSubscriber,
  getSubscriberActivity,
  listAutomations,
  listCampaigns,
  listForms,
  listGroups,
  listSegments,
  listSubscribers,
  manageCustomField,
  manageGroup,
  manageGroupSubscribers,
  scheduleOrSendCampaign
} from './tools';
import { campaignEvents, subscriberEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createOrUpdateSubscriber,
    listSubscribers,
    getSubscriber,
    deleteSubscriber,
    getSubscriberActivity,
    manageGroup,
    listGroups,
    manageGroupSubscribers,
    listSegments,
    manageCustomField,
    createCampaign,
    listCampaigns,
    scheduleOrSendCampaign,
    deleteCampaign,
    getCampaignReport,
    listAutomations,
    listForms
  ],
  triggers: [subscriberEvents, campaignEvents]
});
