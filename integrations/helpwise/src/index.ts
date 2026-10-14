import { Slate } from 'slates';
import { spec } from './spec';
import {
  closeConversations,
  deleteConversation,
  getConversation,
  getCurrentUser,
  listContacts,
  listConversations,
  listMailboxes,
  listMessages,
  listTeams,
  listUsers,
  manageContact,
  manageConversationTags,
  manageMailbox,
  manageNote,
  manageTag,
  manageTemplate,
  manageWebhook,
  searchContacts,
  sendEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    closeConversations,
    manageConversationTags,
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
  triggers: []
});
