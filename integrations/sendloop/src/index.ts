import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountInfo,
  getCampaignReport,
  getCampaigns,
  getListReport,
  getLists,
  importSubscribers,
  manageCampaigns,
  manageCustomFields,
  manageLists,
  manageSegments,
  manageSuppressionList,
  searchSubscribers,
  sendCampaign,
  subscribe,
  unsubscribe,
  updateSubscriber
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccountInfo,
    getLists,
    getListReport,
    importSubscribers,
    manageLists,
    manageCustomFields,
    subscribe,
    unsubscribe,
    searchSubscribers,
    updateSubscriber,
    manageSuppressionList,
    manageSegments,
    manageCampaigns,
    getCampaigns,
    sendCampaign,
    getCampaignReport
  ],
  triggers: []
});
