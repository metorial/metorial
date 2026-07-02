import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelEmbedJobTool,
  chatTool,
  createEmbedJobTool,
  deleteDatasetTool,
  detokenizeTool,
  embedTool,
  getDatasetTool,
  getEmbedJobTool,
  listDatasetsTool,
  listEmbedJobsTool,
  listModelsTool,
  rerankTool,
  tokenizeTool
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
    listDatasetsTool,
    getDatasetTool,
    deleteDatasetTool,
    createEmbedJobTool,
    listEmbedJobsTool,
    getEmbedJobTool,
    cancelEmbedJobTool
  ],
  triggers: [inboundWebhook]
});
