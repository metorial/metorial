import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadDocument,
  getDocument,
  getEmbeddedSignLink,
  getTemplate,
  listBrands,
  listDocuments,
  listTemplates,
  listUsers,
  manageDocument,
  sendDocument,
  sendFromTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendDocument,
    listDocuments,
    getDocument,
    manageDocument,
    sendFromTemplate,
    listTemplates,
    getTemplate,
    downloadDocument,
    getEmbeddedSignLink,
    listUsers,
    listBrands
  ],
  triggers: []
});
