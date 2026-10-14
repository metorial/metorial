import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCampaign,
  getContactCount,
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
    getCampaign,
    getContactCount,
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
