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
  listConversationActivity,
  listConversations,
  listHelpdeskArticles,
  listHelpdeskLocales,
  listInboxes,
  listOperators,
  listPeople,
  manageHelpdeskArticle,
  manageMessageStatus,
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
    manageMessageStatus,
    listConversationActivity,
    listPeople,
    getPerson,
    createPerson,
    updatePerson,
    removePerson,
    listHelpdeskLocales,
    manageHelpdeskArticle,
    listHelpdeskArticles,
    listInboxes,
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
