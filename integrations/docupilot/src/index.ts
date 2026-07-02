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
import { documentGenerated, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, documentGenerated]
});
