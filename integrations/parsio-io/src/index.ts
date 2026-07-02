import { Slate } from 'slates';
import { spec } from './spec';
import {
  createMailbox,
  createWebhook,
  deleteMailbox,
  deleteWebhooks,
  getCollectedEmails,
  getDocument,
  getMailbox,
  getParsedData,
  getTemplate,
  listDocuments,
  listMailboxes,
  listTemplates,
  listWebhooks,
  manageTemplates,
  reparseDocument,
  skipDocuments,
  submitDocument,
  updateMailbox
} from './tools';
import { documentEvent } from './triggers';

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
    reparseDocument,
    skipDocuments,
    getParsedData,
    getCollectedEmails,
    listTemplates,
    getTemplate,
    manageTemplates,
    listWebhooks,
    createWebhook,
    deleteWebhooks
  ],
  triggers: [documentEvent]
});
