import { Slate } from 'slates';
import { spec } from './spec';
import {
  createMailbox,
  deleteMailbox,
  getDocument,
  getMailbox,
  listDocuments,
  listMailboxes,
  listTemplates,
  manageDocument,
  manageTemplate,
  manageWebhook,
  updateMailbox,
  uploadDocument
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
    uploadDocument,
    manageDocument,
    listTemplates,
    manageTemplate,
    manageWebhook
  ],
  triggers: [documentEvent]
});
