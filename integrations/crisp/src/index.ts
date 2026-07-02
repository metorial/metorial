import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchConversationActions,
  createConversation,
  createPerson,
  getConversation,
  getMessages,
  getPerson,
  getWebsiteAvailability,
  listConversations,
  listHelpdeskArticles,
  listOperators,
  listPeople,
  manageHelpdeskArticle,
  manageWebsiteSettings,
  removeConversation,
  removePerson,
  sendMessage,
  updateConversation,
  updatePerson
} from './tools';
import {
  conversationStateChanged,
  inboundWebhook,
  newConversation,
  newMessage,
  peopleProfileChanged
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listConversations,
    getConversation,
    createConversation,
    updateConversation,
    removeConversation,
    sendMessage,
    getMessages,
    listPeople,
    getPerson,
    createPerson,
    updatePerson,
    removePerson,
    manageHelpdeskArticle,
    listHelpdeskArticles,
    listOperators,
    getWebsiteAvailability,
    batchConversationActions,
    manageWebsiteSettings
  ],
  triggers: [
    inboundWebhook,
    newConversation,
    conversationStateChanged,
    newMessage,
    peopleProfileChanged
  ]
});
