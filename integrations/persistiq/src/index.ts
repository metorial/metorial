import { Slate } from 'slates';
import { spec } from './spec';
import {
  addDncDomain,
  createCampaign,
  createLead,
  deleteCampaign,
  duplicateCampaign,
  getLead,
  listCampaignLeads,
  listCampaigns,
  listDncDomains,
  listLeadFields,
  listLeadStatuses,
  listLeads,
  listUsers,
  manageCampaignLead,
  updateLead
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listLeads,
    getLead,
    createLead,
    updateLead,
    listCampaigns,
    listCampaignLeads,
    listDncDomains,
    createCampaign,
    deleteCampaign,
    duplicateCampaign,
    manageCampaignLead,
    listUsers,
    addDncDomain,
    listLeadStatuses,
    listLeadFields
  ],
  triggers: []
});
