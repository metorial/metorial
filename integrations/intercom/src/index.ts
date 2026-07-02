import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createNote,
  getCompany,
  getContact,
  getConversation,
  getNotes,
  getSegments,
  listAdmins,
  listCompanies,
  listTeams,
  manageArticles,
  manageCompanies,
  manageContacts,
  manageConversations,
  manageDataAttributes,
  manageEvents,
  manageSubscriptions,
  manageTags,
  manageTickets,
  searchArticles,
  searchContacts,
  searchConversations,
  sendMessage
} from './tools';
import { companyEvents, contactEvents, conversationEvents, ticketEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageContacts,
    getContact,
    searchContacts,
    manageCompanies,
    getCompany,
    listCompanies,
    manageConversations,
    getConversation,
    searchConversations,
    manageTickets,
    manageArticles,
    searchArticles,
    manageTags,
    sendMessage,
    manageEvents,
    listAdmins,
    createNote,
    listTeams,
    getSegments,
    manageDataAttributes,
    manageSubscriptions,
    getNotes
  ],
  triggers: [contactEvents, conversationEvents, ticketEvents, companyEvents]
});
