import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkCases,
  createCase,
  getCase,
  getForm,
  listApplications,
  listCases,
  listForms,
  listGroups,
  listLookupTables,
  listMobileWorkers,
  listWebUsers,
  manageGroup,
  manageMobileWorker,
  sendSms,
  updateCase
} from './tools';
import { caseUpdated, inboundWebhook, newFormSubmission } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCases,
    getCase,
    createCase,
    updateCase,
    bulkCases,
    listForms,
    getForm,
    listMobileWorkers,
    manageMobileWorker,
    listWebUsers,
    listGroups,
    manageGroup,
    listApplications,
    listLookupTables,
    sendSms
  ],
  triggers: [inboundWebhook, newFormSubmission, caseUpdated]
});
