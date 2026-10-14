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
  listPostSalesProcesses,
  listUnassignedLeads,
  listUsers,
  manageClientFolders,
  manageLeadComments,
  manageProspecting,
  manageTeams,
  sendLeadEmail,
  updateLead,
  whoAmI
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    whoAmI,
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
    listPostSalesProcesses,
    listPipelinesSteps
  ],
  triggers: []
});
