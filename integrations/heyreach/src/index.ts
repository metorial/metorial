import { Slate } from 'slates';
import { spec } from './spec';
import {
  addLeadsToCampaign,
  addLeadsToList,
  createList,
  getCampaign,
  getConversations,
  getLead,
  getLeadsFromList,
  getLinkedInAccounts,
  getStats,
  listCampaigns,
  listLists,
  sendMessage,
  toggleCampaignStatus
} from './tools';
import { outreachEvents } from './triggers';

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
    listLists,
    createList,
    getConversations,
    sendMessage,
    getLinkedInAccounts,
    getStats
  ],
  triggers: [outreachEvents]
});
