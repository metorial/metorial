import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEventTool,
  getAccountTool,
  getBotAnalyticsTool,
  getBotLogsTool,
  getFileUrl,
  listBotIssuesTool,
  listBotsTool,
  listIntegrationsTool,
  listMessagesTool,
  listWorkspacesTool,
  manageBotTool,
  manageConversationTool,
  manageFilesTool,
  manageMessageTool,
  manageStateTool,
  manageTableRowsTool,
  manageTableTool,
  manageUserTool,
  sendMessageTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccountTool,
    getFileUrl,
    listWorkspacesTool,
    listBotsTool,
    manageBotTool,
    manageConversationTool,
    sendMessageTool,
    listMessagesTool,
    manageUserTool,
    manageTableTool,
    manageTableRowsTool,
    manageFilesTool,
    manageMessageTool,
    createEventTool,
    manageStateTool,
    getBotAnalyticsTool,
    getBotLogsTool,
    listBotIssuesTool,
    listIntegrationsTool
  ],
  triggers: []
});
