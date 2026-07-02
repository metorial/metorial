import { Slate } from 'slates';
import { spec } from './spec';
import {
  getChats,
  getMessages,
  getWorkspaceInfo,
  listWhatsAppAccounts,
  manageChat,
  manageFiles,
  manageWebhooks,
  reactToMessage,
  sendMessage
} from './tools';
import { chatEvents, messageEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [messageEvents, chatEvents]
});
