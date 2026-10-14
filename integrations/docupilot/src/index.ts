import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelEnvelope,
  copyTemplate,
  createFolder,
  createTemplate,
  deleteDelivery,
  deleteFolder,
  deleteTemplate,
  generateDocument,
  getCurrentUser,
  getDelivery,
  getEnvelopeDetails,
  getTemplate,
  listContentBlocks,
  listDeliveries,
  listEnvelopes,
  listFolders,
  listMergeHistory,
  listTemplates,
  moveTemplates,
  sendEnvelopeReminder,
  updateFolder,
  updateTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    copyTemplate,
    moveTemplates,
    generateDocument,
    listFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    listDeliveries,
    getDelivery,
    deleteDelivery,
    listMergeHistory,
    listContentBlocks,
    listEnvelopes,
    getEnvelopeDetails,
    cancelEnvelope,
    sendEnvelopeReminder
  ],
  triggers: []
});
