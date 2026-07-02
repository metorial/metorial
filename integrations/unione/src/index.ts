import { Slate } from 'slates';
import { spec } from './spec';
import {
  addSuppression,
  createEventDump,
  createProject,
  deleteDomain,
  deleteEventDump,
  deleteProject,
  deleteSuppression,
  deleteTag,
  deleteTemplate,
  getDomainDnsRecords,
  getEventDump,
  getSuppression,
  getSystemInfo,
  getTemplate,
  listDomains,
  listEventDumps,
  listProjects,
  listSuppressions,
  listTags,
  listTemplates,
  sendEmail,
  subscribeEmail,
  updateProject,
  upsertTemplate,
  validateDomain,
  validateEmail
} from './tools';
import { emailStatusTrigger, spamBlockTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendEmail,
    subscribeEmail,
    validateEmail,
    upsertTemplate,
    getTemplate,
    listTemplates,
    deleteTemplate,
    addSuppression,
    getSuppression,
    listSuppressions,
    deleteSuppression,
    getDomainDnsRecords,
    validateDomain,
    listDomains,
    deleteDomain,
    listTags,
    deleteTag,
    getSystemInfo,
    createEventDump,
    getEventDump,
    listEventDumps,
    deleteEventDump,
    createProject,
    updateProject,
    listProjects,
    deleteProject
  ],
  triggers: [emailStatusTrigger, spamBlockTrigger]
});
