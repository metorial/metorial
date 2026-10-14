import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSession,
  createTicket,
  deleteTicket,
  getArticle,
  getCurrentUser,
  getMessages,
  getSession,
  getTicket,
  listArticles,
  listCollections,
  listEngagements,
  listProjectUsers,
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
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listProjectUsers,
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
    getArticle,
    manageArticle,
    listEngagements,
    manageEngagement,
    manageTeam,
    manageAiContent
  ],
  triggers: []
});
