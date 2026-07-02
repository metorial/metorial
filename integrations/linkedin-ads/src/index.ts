import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createCampaignGroup,
  createConversionRule,
  createCreative,
  getAdAccount,
  getAdAnalytics,
  getCampaign,
  getLeadFormResponses,
  listAdAccounts,
  listCampaignGroups,
  listCampaigns,
  listConversionRules,
  listCreatives,
  listLeadForms,
  sendConversionEvents,
  updateCampaign,
  updateCampaignGroup,
  updateCreative
} from './tools';
import { campaignStatusChanges, inboundWebhook, leadFormSubmissions } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAdAccounts,
    getAdAccount,
    listCampaignGroups,
    createCampaignGroup,
    updateCampaignGroup,
    listCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    listCreatives,
    createCreative,
    updateCreative,
    getAdAnalytics,
    listConversionRules,
    createConversionRule,
    sendConversionEvents,
    listLeadForms,
    getLeadFormResponses
  ],
  triggers: [inboundWebhook, leadFormSubmissions, campaignStatusChanges]
});
