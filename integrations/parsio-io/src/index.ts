import { Slate } from 'slates';
import { spec } from './spec';
import {
  cloneTemplates,
  createMailbox,
  createWebhook,
  deleteMailbox,
  deleteWebhooks,
  getCollectedEmails,
  getDocument,
  getMailbox,
  getParsedData,
  getTemplate,
  getWebhook,
  listDocuments,
  listMailboxes,
  listTemplates,
  listWebhooks,
  manageTemplates,
  parseDocumentSync,
  reparseDocument,
  skipDocuments,
  submitDocument,
  updateMailbox
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listMailboxes,
    getMailbox,
    createMailbox,
    updateMailbox,
    deleteMailbox,
    listDocuments,
    getDocument,
    submitDocument,
    parseDocumentSync,
    reparseDocument,
    skipDocuments,
    getParsedData,
    getCollectedEmails,
    listTemplates,
    getTemplate,
    manageTemplates,
    cloneTemplates,
    listWebhooks,
    getWebhook,
    createWebhook,
    deleteWebhooks
  ],
  triggers: []
});
