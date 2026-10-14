import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSignatureRequest,
  downloadDocument,
  getCurrentUser,
  getDocumentDetails,
  listDocuments,
  listTemplates,
  sendReminders
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createSignatureRequest,
    listDocuments,
    listTemplates,
    getDocumentDetails,
    getCurrentUser,
    downloadDocument,
    sendReminders
  ],
  triggers: []
});
