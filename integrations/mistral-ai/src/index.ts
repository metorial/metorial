import { Slate } from 'slates';
import { spec } from './spec';
import {
  agentCompletionTool,
  cancelBatchJobTool,
  cancelFineTuningJobTool,
  chatCompletionTool,
  codeCompletionTool,
  createBatchJobTool,
  createEmbeddingsTool,
  createFineTuningJobTool,
  deleteFileTool,
  deleteModelTool,
  extractDocumentTool,
  getBatchJobTool,
  getFileTool,
  getFineTuningJobTool,
  listBatchJobsTool,
  listFilesTool,
  listFineTuningJobsTool,
  listModelsTool,
  moderateContentTool
} from './tools';
import { batchJobStatusTrigger, fineTuningJobStatusTrigger, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    chatCompletionTool,
    createEmbeddingsTool,
    moderateContentTool,
    extractDocumentTool,
    listModelsTool,
    listFilesTool,
    getFileTool,
    deleteFileTool,
    createFineTuningJobTool,
    getFineTuningJobTool,
    listFineTuningJobsTool,
    cancelFineTuningJobTool,
    codeCompletionTool,
    agentCompletionTool,
    createBatchJobTool,
    getBatchJobTool,
    listBatchJobsTool,
    cancelBatchJobTool,
    deleteModelTool
  ],
  triggers: [inboundWebhook, fineTuningJobStatusTrigger, batchJobStatusTrigger]
});
