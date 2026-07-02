import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteLead,
  getLeadTool,
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
import {
  activityEventsTrigger,
  contactEventsTrigger,
  leadEventsTrigger,
  opportunityEventsTrigger,
  taskEventsTrigger
} from './triggers';

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
    listUsers
  ],
  triggers: [
    leadEventsTrigger,
    contactEventsTrigger,
    opportunityEventsTrigger,
    activityEventsTrigger,
    taskEventsTrigger
  ]
});
