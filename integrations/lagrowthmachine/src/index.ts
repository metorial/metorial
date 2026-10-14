import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAudience,
  createInboxWebhook,
  createOrUpdateLead,
  deleteInboxWebhook,
  getCampaignStats,
  getCampaigns,
  getCurrentUser,
  importFromLinkedIn,
  listAudiences,
  listIdentities,
  listInboxWebhooks,
  listMembers,
  removeLeadFromAudiences,
  searchLead,
  sendLinkedInMessage,
  updateLeadCampaignStatus
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchLead,
    createOrUpdateLead,
    createAudience,
    removeLeadFromAudiences,
    updateLeadCampaignStatus,
    getCampaigns,
    getCampaignStats,
    getCurrentUser,
    listAudiences,
    sendLinkedInMessage,
    importFromLinkedIn,
    listIdentities,
    listMembers,
    createInboxWebhook,
    listInboxWebhooks,
    deleteInboxWebhook
  ],
  triggers: []
});
