import { Slate } from 'slates';
import { spec } from './spec';
import {
  addOrUpdateSubscriber,
  downloadCampaignContent,
  getAccountHome,
  getCampaignRecipients,
  getCampaignReport,
  getCampaigns,
  getCustomFields,
  getListSubscribers,
  getLists,
  getSubscriber,
  getSubscribers,
  getTask,
  getUnsubscribed,
  importSubscribers,
  manageCampaigns,
  manageCustomFields,
  manageLists,
  removeSubscriber,
  setCampaignContent,
  setCampaignRecipients
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccountHome,
    getSubscribers,
    getTask,
    getCampaignRecipients,
    setCampaignRecipients,
    setCampaignContent,
    downloadCampaignContent,
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
  triggers: []
});
