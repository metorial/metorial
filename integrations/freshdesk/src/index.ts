import { Slate } from 'slates';
import { spec } from './spec';
import {
  addTicketReply,
  createArticle,
  createCompany,
  createContact,
  createTicket,
  createTimeEntry,
  deleteTicket,
  getArticle,
  getCompany,
  getContact,
  getTicket,
  listAgents,
  listCompanies,
  listContacts,
  listConversations,
  listGroups,
  listKnowledgeBase,
  listTickets,
  listTimeEntries,
  searchContacts,
  searchTickets,
  updateCompany,
  updateContact,
  updateTicket
} from './tools';
import { contactEvents, ticketEvents, ticketEventsWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTicket,
    getTicket,
    updateTicket,
    listTickets,
    searchTickets,
    deleteTicket,
    addTicketReply,
    listConversations,
    createContact,
    getContact,
    updateContact,
    listContacts,
    searchContacts,
    createCompany,
    getCompany,
    updateCompany,
    listCompanies,
    listAgents,
    listGroups,
    listKnowledgeBase,
    getArticle,
    createArticle,
    listTimeEntries,
    createTimeEntry
  ],
  triggers: [ticketEvents, contactEvents, ticketEventsWebhook]
});
