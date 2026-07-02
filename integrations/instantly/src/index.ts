import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createLead,
  deleteCampaign,
  deleteLead,
  getCampaign,
  getCampaignAnalytics,
  getEmailAccount,
  getLead,
  listCampaigns,
  listEmailAccounts,
  listEmails,
  listLeads,
  manageAccountCampaignMappings,
  manageBlockList,
  manageCustomTags,
  manageEmailAccount,
  manageLeadLabels,
  manageLeadLists,
  moveLeads,
  replyToEmail,
  updateCampaign,
  updateLead,
  verifyEmail
} from './tools';
import { campaignEvents, leadStatusEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignAnalytics,
    listLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    moveLeads,
    listEmailAccounts,
    getEmailAccount,
    manageEmailAccount,
    listEmails,
    replyToEmail,
    verifyEmail,
    manageBlockList,
    manageCustomTags,
    manageLeadLabels,
    manageLeadLists,
    manageAccountCampaignMappings
  ],
  triggers: [campaignEvents, leadStatusEvents]
});
