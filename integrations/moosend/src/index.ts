import { Slate } from 'slates';
import { spec } from './spec';
import {
  campaignAnalytics,
  createCampaign,
  deleteCampaign,
  getCampaigns,
  getSenders,
  listSubscribers,
  manageCustomField,
  manageMailingList,
  manageSegment,
  manageSubscriber,
  sendCampaign,
  sendTransactionalEmail,
  updateCampaign
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createCampaign,
    getCampaigns,
    getSenders,
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
  triggers: []
});
