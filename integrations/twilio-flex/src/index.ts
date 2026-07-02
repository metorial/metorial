import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInteractionTool,
  getFlexConfigurationTool,
  getWorkspaceStatisticsTool,
  listConversationMessagesTool,
  manageActivitiesTool,
  manageConversationParticipantsTool,
  manageConversationsTool,
  manageFlexFlowsTool,
  manageInteractionChannelTool,
  manageInteractionParticipantsTool,
  manageStudioFlowsTool,
  manageTaskQueuesTool,
  manageTasksTool,
  manageWorkersTool,
  manageWorkflowsTool,
  sendConversationMessageTool
} from './tools';
import {
  interactionWebhookTrigger,
  taskEventsTrigger,
  taskRouterWebhookTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createInteractionTool,
    manageInteractionChannelTool,
    manageInteractionParticipantsTool,
    manageWorkersTool,
    manageTaskQueuesTool,
    manageTasksTool,
    manageWorkflowsTool,
    manageActivitiesTool,
    getFlexConfigurationTool,
    manageFlexFlowsTool,
    manageConversationsTool,
    manageConversationParticipantsTool,
    sendConversationMessageTool,
    listConversationMessagesTool,
    manageStudioFlowsTool,
    getWorkspaceStatisticsTool
  ],
  triggers: [taskEventsTrigger, taskRouterWebhookTrigger, interactionWebhookTrigger]
});
