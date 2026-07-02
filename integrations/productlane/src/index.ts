import { Slate } from 'slates';
import { spec } from './spec';
import {
  createChangelog,
  createCompany,
  createContact,
  createThread,
  createUpvote,
  deleteChangelog,
  deleteCompany,
  deleteContact,
  deleteUpvote,
  getChangelog,
  getCompany,
  getContact,
  getProject,
  getThread,
  getWorkspace,
  listChangelogs,
  listCompanies,
  listContacts,
  listIssues,
  listProjects,
  listThreads,
  listUpvotes,
  listUsers,
  sendThreadMessage,
  updateChangelog,
  updateCompany,
  updateContact,
  updateThread
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    listThreads,
    getThread,
    createThread,
    updateThread,
    sendThreadMessage,
    listProjects,
    getProject,
    listIssues,
    createUpvote,
    listUpvotes,
    deleteUpvote,
    listChangelogs,
    getChangelog,
    createChangelog,
    updateChangelog,
    deleteChangelog,
    getWorkspace,
    listUsers
  ],
  triggers: [inboundWebhook]
});
