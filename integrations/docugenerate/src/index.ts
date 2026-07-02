import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteDocument,
  deleteTemplate,
  generateDocument,
  getDocument,
  getTemplate,
  listDocuments,
  listTemplates,
  updateDocument,
  updateTemplate
} from './tools';
import { inboundWebhook, watchNewDocument, watchNewTemplate } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    generateDocument,
    listTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    listDocuments,
    getDocument,
    updateDocument,
    deleteDocument
  ],
  triggers: [inboundWebhook, watchNewDocument, watchNewTemplate]
});
