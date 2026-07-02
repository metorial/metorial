import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyTemplate,
  createContract,
  createTemplate,
  deleteTemplate,
  generatePdfPreview,
  getTemplate,
  listTemplates,
  manageCollaborators,
  manageSigners,
  queryContract,
  updateTemplate,
  withdrawContract
} from './tools';
import { contractEvents, errorEvents, signerEvents } from './triggers';

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
    manageCollaborators
  ],
  triggers: [contractEvents, signerEvents, errorEvents]
});
