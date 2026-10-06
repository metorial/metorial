import { Slate } from 'slates';
import { spec } from './spec';
import {
  createLead,
  deleteLead,
  duplicateLead,
  getLead,
  getLeadHistory,
  listLeadDuplicates,
  listLeads,
  listPipelinesSteps,
  listUnassignedLeads,
  listUsers,
  manageClientFolders,
  manageLeadComments,
  manageProspecting,
  manageTeams,
  sendLeadEmail,
  updateLead
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createLead,
    getLead,
    listLeads,
    listLeadDuplicates,
    listUnassignedLeads,
    updateLead,
    deleteLead,
    duplicateLead,
    manageLeadComments,
    getLeadHistory,
    sendLeadEmail,
    manageClientFolders,
    listUsers,
    manageTeams,
    manageProspecting,
    listPipelinesSteps
  ],
  triggers: []
});
