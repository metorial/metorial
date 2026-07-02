import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseConnectionResources,
  createKnowledgeBase,
  deleteConnection,
  deleteDocument,
  deleteKnowledgeBase,
  deleteKnowledgeBaseResource,
  flowFeedback,
  getConnection,
  getKnowledgeBase,
  getOrganizationAnalytics,
  getProjectAnalytics,
  getStorageAnalytics,
  listConnections,
  listConversations,
  listDocuments,
  listFolders,
  listKnowledgeBaseResources,
  listKnowledgeBases,
  listToolProviders,
  listUserConversations,
  manageConversation,
  manageFolder,
  runAction,
  runFlow,
  syncKnowledgeBase,
  updateKnowledgeBase
} from './tools';
import { flowRunTrigger, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    runFlow,
    flowFeedback,
    listDocuments,
    deleteDocument,
    listKnowledgeBases,
    getKnowledgeBase,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    syncKnowledgeBase,
    listKnowledgeBaseResources,
    deleteKnowledgeBaseResource,
    listConnections,
    getConnection,
    deleteConnection,
    browseConnectionResources,
    getProjectAnalytics,
    getOrganizationAnalytics,
    getStorageAnalytics,
    listConversations,
    manageConversation,
    listUserConversations,
    listFolders,
    manageFolder,
    listToolProviders,
    runAction
  ],
  triggers: [inboundWebhook, flowRunTrigger]
});
