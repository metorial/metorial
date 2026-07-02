import { Slate } from 'slates';
import { spec } from './spec';
import {
  addFileToGraph,
  chatCompletion,
  createKnowledgeGraph,
  deleteFile,
  deleteKnowledgeGraph,
  downloadFile,
  getAgentDetails,
  getFile,
  getKnowledgeGraph,
  invokeAgent,
  listAgents,
  listFiles,
  listKnowledgeGraphs,
  listModels,
  queryKnowledgeGraph,
  removeFileFromGraph,
  textCompletion,
  updateKnowledgeGraph
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    chatCompletion,
    textCompletion,
    createKnowledgeGraph,
    listKnowledgeGraphs,
    getKnowledgeGraph,
    updateKnowledgeGraph,
    deleteKnowledgeGraph,
    queryKnowledgeGraph,
    listFiles,
    getFile,
    deleteFile,
    downloadFile,
    addFileToGraph,
    removeFileFromGraph,
    invokeAgent,
    listAgents,
    getAgentDetails,
    listModels
  ],
  triggers: [inboundWebhook]
});
