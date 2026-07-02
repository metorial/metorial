import { Slate } from 'slates';
import { spec } from './spec';
import {
  addDncDomain,
  createCampaign,
  createLead,
  deleteCampaign,
  getLead,
  listCampaigns,
  listLeadFields,
  listLeadStatuses,
  listLeads,
  listUsers,
  manageCampaignLead,
  updateLead
} from './tools';
import { inboundWebhook, prospectChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listLeads,
    getLead,
    createLead,
    updateLead,
    listCampaigns,
    createCampaign,
    deleteCampaign,
    manageCampaignLead,
    listUsers,
    addDncDomain,
    listLeadStatuses,
    listLeadFields
  ],
  triggers: [inboundWebhook, prospectChanges]
});
