import { Slate } from 'slates';
import { spec } from './spec';
import {
  addComment,
  assignTicket,
  createTicket,
  getReports,
  getTicket,
  getTicketAudit,
  getUser,
  listAgents,
  listComments,
  listEmails,
  listReplies,
  listTickets,
  manageLabels,
  manageSnippets,
  replyToTicket,
  searchTickets,
  updateTicketStatus
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTickets,
    getTicket,
    searchTickets,
    createTicket,
    updateTicketStatus,
    replyToTicket,
    listReplies,
    addComment,
    listComments,
    assignTicket,
    manageLabels,
    listAgents,
    manageSnippets,
    getReports,
    getUser,
    listEmails,
    getTicketAudit
  ],
  triggers: []
});
