import { Slate } from 'slates';
import { spec } from './spec';
import {
  addMessage,
  createArticle,
  createContact,
  createContactNote,
  createConversation,
  createIncident,
  createResponseTemplate,
  createStaff,
  deleteContactNote,
  getConversation,
  getReport,
  listArticles,
  listChannels,
  listContactNotes,
  listContacts,
  listConversations,
  listIncidents,
  listResponseTemplates,
  listSatisfactionRatings,
  listStaff,
  listSystems,
  updateArticle,
  updateContact,
  updateConversation,
  updateIncident,
  updateResponseTemplate
} from './tools';
import {
  inboundWebhook,
  newContacts,
  newConversations,
  updatedConversations
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listConversations,
    getConversation,
    createConversation,
    updateConversation,
    addMessage,
    listContacts,
    createContact,
    updateContact,
    listContactNotes,
    createContactNote,
    deleteContactNote,
    listArticles,
    createArticle,
    updateArticle,
    listIncidents,
    createIncident,
    updateIncident,
    getReport,
    listChannels,
    listResponseTemplates,
    createResponseTemplate,
    updateResponseTemplate,
    listStaff,
    createStaff,
    listSatisfactionRatings,
    listSystems
  ],
  triggers: [inboundWebhook, newConversations, updatedConversations, newContacts]
});
