import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSession,
  createTicket,
  deleteTicket,
  getMessages,
  getSession,
  getTicket,
  listArticles,
  listCollections,
  listEngagements,
  listSessions,
  listTickets,
  manageAiContent,
  manageArticle,
  manageCollection,
  manageEngagement,
  manageTeam,
  sendMessage,
  updateSession,
  updateTicket
} from './tools';
import { feedbackWebhook, ticketUpdated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTickets,
    getTicket,
    createTicket,
    updateTicket,
    deleteTicket,
    listSessions,
    getSession,
    createSession,
    updateSession,
    getMessages,
    sendMessage,
    listCollections,
    manageCollection,
    listArticles,
    manageArticle,
    listEngagements,
    manageEngagement,
    manageTeam,
    manageAiContent
  ],
  triggers: [feedbackWebhook, ticketUpdated]
});
