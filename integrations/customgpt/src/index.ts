import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeMessage,
  cloneAgent,
  createAgent,
  deleteAgent,
  getAccountInfo,
  getAgent,
  getCitation,
  getMessages,
  getReports,
  listAgents,
  listConversations,
  manageConversation,
  manageDocuments,
  manageLabels,
  manageSettings,
  manageSources,
  sendMessage,
  updateAgent
} from './tools';
import { inboundWebhook, newConversation, newMessage } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAgents,
    createAgent,
    getAgent,
    updateAgent,
    deleteAgent,
    cloneAgent,
    sendMessage,
    listConversations,
    manageConversation,
    getMessages,
    analyzeMessage,
    manageSources,
    manageDocuments,
    manageSettings,
    manageLabels,
    getReports,
    getCitation,
    getAccountInfo
  ],
  triggers: [inboundWebhook, newConversation, newMessage]
});
