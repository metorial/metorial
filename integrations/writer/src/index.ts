import { Slate } from 'slates';
import { spec } from './spec';
import {
  addFileToGraph,
  chatCompletion,
  createKnowledgeGraph,
  deleteFile,
  deleteKnowledgeGraph,
  downloadFile,
  downloadOriginalFile,
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
  updateKnowledgeGraph,
  uploadFile
} from './tools';

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
    uploadFile,
    downloadOriginalFile,
    addFileToGraph,
    removeFileFromGraph,
    invokeAgent,
    listAgents,
    getAgentDetails,
    listModels
  ],
  triggers: []
});
