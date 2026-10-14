import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplate,
  deleteDocument,
  deleteTemplate,
  downloadDocument,
  downloadTemplate,
  generateDocument,
  getDocument,
  getTemplate,
  listDocuments,
  listTemplates,
  updateDocument,
  updateTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createTemplate,
    generateDocument,
    downloadDocument,
    downloadTemplate,
    listTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    listDocuments,
    getDocument,
    updateDocument,
    deleteDocument
  ],
  triggers: []
});
