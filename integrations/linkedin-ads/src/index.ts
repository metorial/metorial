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
  getCampaignGroup,
  getCreative,
  getCurrentUser,
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
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getCampaignGroup,
    getCreative,
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
  triggers: []
});
