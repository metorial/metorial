import { Slate } from 'slates';
import { spec } from './spec';
import {
  getChats,
  getFileUrl,
  getMessages,
  getWorkspace,
  getWorkspaceInfo,
  listChatLabels,
  listWhatsAppAccounts,
  manageChat,
  manageFiles,
  manageWebhooks,
  reactToMessage,
  sendMessage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getFileUrl,
    getWorkspace,
    listChatLabels,
    sendMessage,
    getChats,
    getMessages,
    manageChat,
    listWhatsAppAccounts,
    manageFiles,
    getWorkspaceInfo,
    manageWebhooks,
    reactToMessage
  ],
  triggers: []
});
