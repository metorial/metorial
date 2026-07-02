import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEventTool,
  getBotAnalyticsTool,
  getBotLogsTool,
  listBotIssuesTool,
  listBotsTool,
  listIntegrationsTool,
  listMessagesTool,
  manageBotTool,
  manageConversationTool,
  manageFilesTool,
  manageStateTool,
  manageTableRowsTool,
  manageTableTool,
  manageUserTool,
  sendMessageTool
} from './tools';
import { inboundWebhook, incomingEventTrigger, newMessageTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listBotsTool,
    manageBotTool,
    manageConversationTool,
    sendMessageTool,
    listMessagesTool,
    manageUserTool,
    manageTableTool,
    manageTableRowsTool,
    manageFilesTool,
    createEventTool,
    manageStateTool,
    getBotAnalyticsTool,
    getBotLogsTool,
    listBotIssuesTool,
    listIntegrationsTool
  ],
  triggers: [inboundWebhook, incomingEventTrigger, newMessageTrigger]
});
