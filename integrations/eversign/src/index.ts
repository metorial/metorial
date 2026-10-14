import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelDocument,
  createBulkJob,
  createDocumentFromTemplate,
  downloadDocument,
  getBulkCsvTemplate,
  getBulkJob,
  getDocument,
  getDocumentAuditLog,
  listBulkJobs,
  listBusinesses,
  listDocuments,
  listTemplates,
  manageSigner,
  sendDocument
} from './tools';
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
    getBulkJob,
    getBulkCsvTemplate,
    listBulkJobs,
    getDocumentAuditLog
  ],
  triggers: []
});
