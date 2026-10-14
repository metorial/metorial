import { Slate } from 'slates';
import { spec } from './spec';
import {
  convertLead,
  generatePdf,
  getCurrentUser,
  getRecord,
  listRecords,
  listStream,
  manageAccounts,
  manageAttachments,
  manageCalls,
  manageCases,
  manageContacts,
  manageLeads,
  manageMeetings,
  manageOpportunities,
  manageRecord,
  manageRelationships,
  manageTasks,
  postStreamNote,
  sendEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageContacts,
    manageAccounts,
    manageLeads,
    manageOpportunities,
    manageCases,
    manageMeetings,
    manageCalls,
    manageTasks,
    convertLead,
    sendEmail,
    manageRelationships,
    listRecords,
    getCurrentUser,
    listStream,
    manageRecord,
    getRecord,
    manageAttachments,
    generatePdf,
    postStreamNote
  ],
  triggers: []
});
