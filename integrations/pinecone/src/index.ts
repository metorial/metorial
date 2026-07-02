import { Slate } from 'slates';
import { spec } from './spec';
import {
  chatWithAssistantTool,
  configureIndexTool,
  createIndexTool,
  createIntegratedIndexTool,
  deleteVectorsTool,
  describeIndexStatsTool,
  fetchVectorsByMetadataTool,
  fetchVectorsTool,
  generateEmbeddingsTool,
  getAssistantContextTool,
  listIndexesTool,
  listVectorIdsTool,
  manageAssistantFilesTool,
  manageAssistantTool,
  manageNamespacesTool,
  queryVectorsTool,
  rerankTool,
  searchRecordsTool,
  updateVectorTool,
  upsertTextRecordsTool,
  upsertVectorsTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listIndexesTool,
    createIndexTool,
    createIntegratedIndexTool,
    configureIndexTool,
    manageNamespacesTool,
    upsertVectorsTool,
    upsertTextRecordsTool,
    queryVectorsTool,
    searchRecordsTool,
    fetchVectorsTool,
    fetchVectorsByMetadataTool,
    updateVectorTool,
    deleteVectorsTool,
    describeIndexStatsTool,
    listVectorIdsTool,
    generateEmbeddingsTool,
    rerankTool,
    chatWithAssistantTool,
    getAssistantContextTool,
    manageAssistantFilesTool,
    manageAssistantTool
  ],
  triggers: [inboundWebhook]
});
