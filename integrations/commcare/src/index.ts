import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkCases,
  bulkGetCases,
  createCase,
  getCase,
  getCurrentUser,
  getForm,
  listApplications,
  listCases,
  listForms,
  listGroups,
  listLookupTables,
  listMobileWorkers,
  listProjects,
  listWebUsers,
  manageGroup,
  manageMobileWorker,
  sendSms,
  updateCase
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listProjects,
    bulkGetCases,
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
  triggers: []
});
