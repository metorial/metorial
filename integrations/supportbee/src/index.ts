import { Slate } from 'slates';
import { spec } from './spec';
import {
  addComment,
  assignTicket,
  createTicket,
  getReports,
  getTicket,
  listAgents,
  listComments,
  listReplies,
  listTickets,
  manageLabels,
  manageSnippets,
  replyToTicket,
  searchTickets,
  updateTicketStatus
} from './tools';
import { assignmentEvents, replyCommentEvents, ticketEvents } from './triggers';

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
    getReports
  ],
  triggers: [ticketEvents, replyCommentEvents, assignmentEvents]
});
