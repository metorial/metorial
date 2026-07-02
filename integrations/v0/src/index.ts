import { Slate } from 'slates';
import { spec } from './spec';
import {
  assignProjectToChatTool,
  createChatTool,
  createDeploymentTool,
  createEnvVarsTool,
  createHookTool,
  createProjectTool,
  deleteChatTool,
  deleteDeploymentTool,
  deleteEnvVarsTool,
  deleteHookTool,
  deleteProjectTool,
  getAccountInfoTool,
  getChatTool,
  getDeploymentLogsTool,
  getDeploymentTool,
  getHookTool,
  getProjectTool,
  initChatTool,
  listChatsTool,
  listDeploymentsTool,
  listEnvVarsTool,
  listHooksTool,
  listProjectsTool,
  sendMessageTool,
  updateEnvVarsTool,
  updateProjectTool
} from './tools';
import { chatEventTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjectsTool,
    createProjectTool,
    getProjectTool,
    updateProjectTool,
    deleteProjectTool,
    createChatTool,
    initChatTool,
    listChatsTool,
    getChatTool,
    deleteChatTool,
    sendMessageTool,
    createDeploymentTool,
    getDeploymentTool,
    listDeploymentsTool,
    deleteDeploymentTool,
    getDeploymentLogsTool,
    listEnvVarsTool,
    createEnvVarsTool,
    updateEnvVarsTool,
    deleteEnvVarsTool,
    listHooksTool,
    createHookTool,
    getHookTool,
    deleteHookTool,
    assignProjectToChatTool,
    getAccountInfoTool
  ],
  triggers: [chatEventTrigger]
});
