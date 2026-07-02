import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteConversation,
  getConversation,
  listContacts,
  listConversations,
  listMailboxes,
  listMessages,
  listTeams,
  listUsers,
  manageContact,
  manageMailbox,
  manageNote,
  manageTag,
  manageTemplate,
  manageWebhook,
  searchContacts,
  sendEmail
} from './tools';
import { conversationEvents, messageEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listMailboxes,
    manageMailbox,
    listConversations,
    getConversation,
    deleteConversation,
    sendEmail,
    listMessages,
    manageContact,
    listContacts,
    searchContacts,
    manageNote,
    manageTag,
    listTeams,
    listUsers,
    manageTemplate,
    manageWebhook
  ],
  triggers: [conversationEvents, messageEvents]
});
