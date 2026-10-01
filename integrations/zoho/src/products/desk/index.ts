import { addTicketComment } from './tools/add-ticket-comment';
import { addTicketThread } from './tools/add-ticket-thread';
import { createTicket } from './tools/create-ticket';
import { deleteAccount } from './tools/delete-account';
import { deleteArticle } from './tools/delete-article';
import { deleteContact } from './tools/delete-contact';
import { deleteTask } from './tools/delete-task';
import { deleteTicket } from './tools/delete-ticket';
import { getTicket } from './tools/get-ticket';
import { listAccounts } from './tools/list-accounts';
import { listAgents } from './tools/list-agents';
import { listArticles } from './tools/list-articles';
import { listContacts } from './tools/list-contacts';
import { listDepartments } from './tools/list-departments';
import { listTasks } from './tools/list-tasks';
import { listTickets } from './tools/list-tickets';
import { manageAccount } from './tools/manage-account';
import { manageArticle } from './tools/manage-article';
import { manageContact } from './tools/manage-contact';
import { manageTask } from './tools/manage-task';
import { manageTimeEntry } from './tools/manage-time-entry';
import { search } from './tools/search';
import { updateTicket } from './tools/update-ticket';

export let deskTools = [
  createTicket,
  deleteTask,
  listAgents,
  addTicketComment,
  deleteContact,
  deleteArticle,
  deleteAccount,
  manageContact,
  manageArticle,
  getTicket,
  manageAccount,
  search,
  listDepartments,
  listAccounts,
  listContacts,
  updateTicket,
  listTasks,
  manageTask,
  addTicketThread,
  manageTimeEntry,
  listTickets,
  deleteTicket,
  listArticles
];
