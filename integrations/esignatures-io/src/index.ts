import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyTemplate,
  createContract,
  createTemplate,
  deleteTemplate,
  generatePdfPreview,
  getDocumentContent,
  getFileUrl,
  getTemplate,
  listTemplates,
  manageCollaborators,
  manageSigners,
  queryContract,
  sendDraftContract,
  updateDocumentContent,
  updateTemplate,
  withdrawContract
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContract,
    queryContract,
    withdrawContract,
    generatePdfPreview,
    manageSigners,
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    copyTemplate,
    deleteTemplate,
    manageCollaborators,
    sendDraftContract,
    getDocumentContent,
    updateDocumentContent,
    getFileUrl
  ],
  triggers: []
});
