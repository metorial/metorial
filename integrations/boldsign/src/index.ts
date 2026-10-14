import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadDocument,
  extendDocumentExpiry,
  getDocument,
  getEmbeddedSignLink,
  getTemplate,
  listBrands,
  listContacts,
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
    extendDocumentExpiry,
    getEmbeddedSignLink,
    listUsers,
    listContacts,
    listBrands
  ],
  triggers: []
});
