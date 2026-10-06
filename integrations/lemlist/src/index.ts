import { Slate } from 'slates';
import { spec } from './spec';
import {
  addLeadToCampaign,
  createCampaign,
  deleteLead,
  getActivities,
  getCampaign,
  getCampaignSequences,
  getCampaignStats,
  getDatabaseFilters,
  getLead,
  getTeamInfo,
  listCampaignLeads,
  listCampaigns,
  manageSubscriptions,
  manageUnsubscribes,
  searchPeopleDatabase,
  updateCampaign,
  updateLead
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    getCampaignStats,
    addLeadToCampaign,
    getLead,
    listCampaignLeads,
    updateLead,
    deleteLead,
    getActivities,
    manageUnsubscribes,
    searchPeopleDatabase,
    getTeamInfo,
    manageSubscriptions,
    getDatabaseFilters,
    getCampaignSequences
  ],
  triggers: []
});
