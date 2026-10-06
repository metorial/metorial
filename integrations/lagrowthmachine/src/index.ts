import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInboxWebhook,
  createOrUpdateLead,
  deleteInboxWebhook,
  getCampaigns,
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
    removeLeadFromAudiences,
    updateLeadCampaignStatus,
    getCampaigns,
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
