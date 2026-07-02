import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelDocument,
  createBulkJob,
  createDocumentFromTemplate,
  downloadDocument,
  getBulkJob,
  getDocument,
  listBusinesses,
  listDocuments,
  listTemplates,
  manageSigner,
  sendDocument
} from './tools';
import { documentEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendDocument,
    getDocument,
    listDocuments,
    cancelDocument,
    createDocumentFromTemplate,
    listTemplates,
    downloadDocument,
    manageSigner,
    listBusinesses,
    createBulkJob,
    getBulkJob
  ],
  triggers: [documentEvent]
});
