import { Slate } from 'slates';
import { spec } from './spec';
import {
  addLeadsToCampaign,
  addLeadsToList,
  createList,
  deleteLeadsFromList,
  getCampaign,
  getConversations,
  getLead,
  getLeadsFromList,
  getLinkedInAccounts,
  getStats,
  listCampaigns,
  listLists,
  sendMessage,
  stopLeadInCampaign,
  toggleCampaignStatus
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    toggleCampaignStatus,
    addLeadsToCampaign,
    getLead,
    getLeadsFromList,
    addLeadsToList,
    deleteLeadsFromList,
    stopLeadInCampaign,
    listLists,
    createList,
    getConversations,
    sendMessage,
    getLinkedInAccounts,
    getStats
  ],
  triggers: []
});
