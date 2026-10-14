import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createSubscriber,
  deleteSubscribers,
  getCampaign,
  getCampaignStatistics,
  getSubscriber,
  listCampaigns,
  listFields,
  listGroups,
  listSegments,
  listSubscribers,
  listWorkflows,
  manageGroup,
  manageSubscriberGroups,
  sendTransactionalEmail,
  startWorkflow,
  updateSubscriber
} from './tools';
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
    getCampaign,
    sendTransactionalEmail,
    startWorkflow,
    listSegments,
    listFields,
    listWorkflows,
    getCampaignStatistics
  ],
  triggers: []
});
