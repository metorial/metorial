import { Slate } from 'slates';
import { spec } from './spec';
import {
  chatWithAssistantTool,
  configureIndexTool,
  createIndexTool,
  deleteVectorsTool,
  describeIndexStatsTool,
  fetchVectorsTool,
  generateEmbeddingsTool,
  listIndexesTool,
  listVectorIdsTool,
  manageAssistantTool,
  queryVectorsTool,
  rerankTool,
  updateVectorTool,
  upsertVectorsTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listIndexesTool,
    createIndexTool,
    configureIndexTool,
    upsertVectorsTool,
    queryVectorsTool,
    fetchVectorsTool,
    updateVectorTool,
    deleteVectorsTool,
    describeIndexStatsTool,
    listVectorIdsTool,
    generateEmbeddingsTool,
    rerankTool,
    chatWithAssistantTool,
    manageAssistantTool
  ],
  triggers: [inboundWebhook]
});
