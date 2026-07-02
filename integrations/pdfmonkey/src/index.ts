import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplate,
  deleteDocument,
  deleteTemplate,
  generateDocument,
  getAccountInfo,
  getDocument,
  getTemplate,
  listDocuments,
  listTemplates,
  updateTemplate
} from './tools';
import { documentGenerated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    generateDocument,
    getDocument,
    listDocuments,
    deleteDocument,
    getTemplate,
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getAccountInfo
  ],
  triggers: [documentGenerated]
});
