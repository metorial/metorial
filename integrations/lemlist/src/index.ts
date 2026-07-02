import { Slate } from 'slates';
import { spec } from './spec';
import {
  addLeadToCampaign,
  createCampaign,
  deleteLead,
  getActivities,
  getCampaign,
  getCampaignStats,
  getLead,
  getTeamInfo,
  listCampaignLeads,
  listCampaigns,
  manageUnsubscribes,
  searchPeopleDatabase,
  updateCampaign,
  updateLead
} from './tools';
import { activityEvent } from './triggers';

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
    getTeamInfo
  ],
  triggers: [activityEvent]
});
