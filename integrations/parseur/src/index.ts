import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyMailbox,
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
  uploadDocument,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listMailboxes,
    getMailbox,
    createMailbox,
    updateMailbox,
    copyMailbox,
    deleteMailbox,
    listDocuments,
    getDocument,
    uploadDocument,
    uploadFile,
    manageDocument,
    listTemplates,
    manageTemplate,
    manageWebhook
  ],
  triggers: []
});
