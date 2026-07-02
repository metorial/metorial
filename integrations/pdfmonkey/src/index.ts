import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplate,
  deleteDocument,
  deleteTemplate,
  downloadDocument,
  generateDocument,
  getAccountInfo,
  getDocument,
  getTemplate,
  listDocuments,
  listEngines,
  listTemplates,
  updateDocument,
  updateTemplate
} from './tools';
import { documentGenerated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    generateDocument,
    downloadDocument,
    updateDocument,
    getDocument,
    listDocuments,
    deleteDocument,
    getTemplate,
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    listEngines,
    getAccountInfo
  ],
  triggers: [documentGenerated]
});
