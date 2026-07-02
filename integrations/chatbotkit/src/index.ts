import { Slate } from 'slates';
import { spec } from './spec';
import {
  conversationFeedbackTool,
  listMessagesTool,
  listResourcesTool,
  manageBotTool,
  manageContactTool,
  manageConversationTool,
  manageDatasetTool,
  manageIntegrationTool,
  manageMemoryTool,
  manageSkillsetTool,
  manageSpaceTool,
  sendMessageTool
} from './tools';
import { chatbotkitEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageBotTool,
    manageConversationTool,
    sendMessageTool,
    manageDatasetTool,
    manageSkillsetTool,
    manageContactTool,
    manageMemoryTool,
    manageIntegrationTool,
    manageSpaceTool,
    listResourcesTool,
    listMessagesTool,
    conversationFeedbackTool
  ],
  triggers: [chatbotkitEventsTrigger]
});
