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
  triggers: []
});
