import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInteractionTool,
  getFlexConfigurationTool,
  getInteractionTool,
  getWorkspaceStatisticsTool,
  listConversationMessagesTool,
  listWorkspacesTool,
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
export let provider = Slate.create({
  spec,
  tools: [
    createInteractionTool,
    getInteractionTool,
    listWorkspacesTool,
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
  triggers: []
});
