import { Slate } from 'slates';
import { spec } from './spec';
import {
  addDataToKnowledgeBaseTool,
  bulkRunPipelineTool,
  controlPipelineRunTool,
  createChatbotTool,
  createKnowledgeBaseTool,
  createTransformationTool,
  deleteChatbotTool,
  deleteKnowledgeBaseTool,
  deletePipelineTool,
  deleteTransformationTool,
  getChatbotTool,
  getKnowledgeBaseTool,
  getPipelineTool,
  getTransformationTool,
  listChatbotsTool,
  listKnowledgeBasesTool,
  listPipelinesTool,
  listTransformationsTool,
  manageDocumentsTool,
  queryKnowledgeBaseTool,
  runChatbotTool,
  runPipelineTool,
  runTransformationTool,
  terminateChatbotSessionTool
} from './tools';
import {
  chatbotChangesTrigger,
  inboundWebhook,
  knowledgeBaseChangesTrigger,
  pipelineChangesTrigger,
  transformationChangesTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    runPipelineTool,
    bulkRunPipelineTool,
    controlPipelineRunTool,
    listPipelinesTool,
    getPipelineTool,
    deletePipelineTool,
    createKnowledgeBaseTool,
    listKnowledgeBasesTool,
    getKnowledgeBaseTool,
    deleteKnowledgeBaseTool,
    addDataToKnowledgeBaseTool,
    queryKnowledgeBaseTool,
    manageDocumentsTool,
    runChatbotTool,
    listChatbotsTool,
    getChatbotTool,
    createChatbotTool,
    deleteChatbotTool,
    terminateChatbotSessionTool,
    runTransformationTool,
    listTransformationsTool,
    getTransformationTool,
    createTransformationTool,
    deleteTransformationTool
  ],
  triggers: [
    inboundWebhook,
    pipelineChangesTrigger,
    knowledgeBaseChangesTrigger,
    chatbotChangesTrigger,
    transformationChangesTrigger
  ]
});
