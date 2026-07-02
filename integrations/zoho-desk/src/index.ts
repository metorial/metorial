import { Slate } from 'slates';
import { spec } from './spec';
import {
  addTicketComment,
  addTicketThread,
  createTicket,
  deleteAccount,
  deleteArticle,
  deleteContact,
  deleteTask,
  deleteTicket,
  getTicket,
  listAccounts,
  listAgents,
  listArticles,
  listContacts,
  listDepartments,
  listTasks,
  listTickets,
  manageAccount,
  manageArticle,
  manageContact,
  manageTask,
  manageTimeEntry,
  search,
  updateTicket
} from './tools';
import {
  accountEvents,
  activityEvents,
  agentEvents,
  articleEvents,
  contactEvents,
  taskEvents,
  ticketEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTicket,
    getTicket,
    updateTicket,
    listTickets,
    deleteTicket,
    addTicketComment,
    addTicketThread,
    manageContact,
    listContacts,
    deleteContact,
    manageAccount,
    listAccounts,
    deleteAccount,
    search,
    manageArticle,
    listArticles,
    deleteArticle,
    listAgents,
    manageTask,
    listTasks,
    deleteTask,
    manageTimeEntry,
    listDepartments
  ],
  triggers: [
    ticketEvents,
    contactEvents,
    accountEvents,
    agentEvents,
    taskEvents,
    articleEvents,
    activityEvents
  ]
});
