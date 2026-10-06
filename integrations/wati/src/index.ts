import { Slate } from 'slates';
import { spec } from './spec';
import {
  getMessages,
  listCampaigns,
  listChannels,
  listContacts,
  listTemplates,
  manageContact,
  manageConversation,
  sendMessage,
  sendTemplateMessage,
  startChatbot
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    sendTemplateMessage,
    listContacts,
    manageContact,
    getMessages,
    listTemplates,
    manageConversation,
    listCampaigns,
    listChannels,
    startChatbot
  ],
  triggers: []
});
