import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteLead,
  deleteTask,
  getCurrentUser,
  getLeadTool,
  getTasks,
  listActivities,
  listContacts,
  listLeadsTool,
  listOpportunities,
  listPipelinesAndStatuses,
  listSmartViews,
  listUsers,
  manageContact,
  manageEmailTemplate,
  manageLeadTool,
  manageNote,
  manageOpportunity,
  manageTask,
  searchLeads,
  sendEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageLeadTool,
    getLeadTool,
    listLeadsTool,
    deleteLead,
    manageContact,
    listContacts,
    manageOpportunity,
    listOpportunities,
    manageTask,
    listActivities,
    manageNote,
    sendEmail,
    manageEmailTemplate,
    searchLeads,
    listSmartViews,
    listPipelinesAndStatuses,
    listUsers,
    getCurrentUser,
    getTasks,
    deleteTask
  ],
  triggers: []
});
