import { Slate } from 'slates';
import { spec } from './spec';
import {
  addProspects,
  changeCampaignStatus,
  createCampaign,
  deleteCampaign,
  deleteProspects,
  generateReport,
  getCampaign,
  getProspectResponses,
  getReport,
  listCampaigns,
  listInboxMessages,
  listLinkedInAccounts,
  listMailboxes,
  listUsers,
  manageBlacklist,
  manageManualTasks,
  replyToMessage,
  searchProspects,
  updateCampaign,
  updateProspectStatus
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    changeCampaignStatus,
    deleteCampaign,
    searchProspects,
    addProspects,
    updateProspectStatus,
    deleteProspects,
    getProspectResponses,
    listInboxMessages,
    replyToMessage,
    listMailboxes,
    listLinkedInAccounts,
    manageBlacklist,
    manageManualTasks,
    generateReport,
    getReport,
    listUsers
  ],
  triggers: []
});
