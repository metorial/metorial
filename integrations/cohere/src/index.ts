import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelEmbedJobTool,
  chatTool,
  createDatasetTool,
  createEmbedJobTool,
  deleteDatasetTool,
  detokenizeTool,
  embedTool,
  getDatasetTool,
  getDatasetUsageTool,
  getEmbedJobTool,
  getModelTool,
  listDatasetsTool,
  listEmbedJobsTool,
  listModelsTool,
  rerankTool,
  tokenizeTool,
  transcribeAudioTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    chatTool,
    embedTool,
    rerankTool,
    tokenizeTool,
    detokenizeTool,
    listModelsTool,
    getModelTool,
    createDatasetTool,
    listDatasetsTool,
    getDatasetUsageTool,
    getDatasetTool,
    deleteDatasetTool,
    createEmbedJobTool,
    listEmbedJobsTool,
    getEmbedJobTool,
    cancelEmbedJobTool,
    transcribeAudioTool
  ],
  triggers: [inboundWebhook]
});
