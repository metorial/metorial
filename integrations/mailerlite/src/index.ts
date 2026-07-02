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
  listCampaignLanguages,
  listCampaigns,
  listForms,
  listGroups,
  listSegments,
  listSubscribers,
  listTimezones,
  manageCustomField,
  manageGroup,
  manageGroupSubscribers,
  manageWebhook,
  scheduleOrSendCampaign,
  updateCampaign
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
    updateCampaign,
    listCampaigns,
    scheduleOrSendCampaign,
    deleteCampaign,
    getCampaignReport,
    listAutomations,
    listForms,
    manageWebhook,
    listTimezones,
    listCampaignLanguages
  ],
  triggers: [subscriberEvents, campaignEvents]
});
