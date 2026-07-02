import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTicket,
  deleteTicket,
  getReport,
  getTicket,
  listTickets,
  manageAgents,
  manageCannedResponses,
  manageCustomFields,
  manageMacros,
  manageRules,
  manageTags,
  manageTeams,
  mergeTickets,
  queryAuditLog,
  sendRatingRequest,
  updateTicket
} from './tools';
import { ticketEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTickets,
    getTicket,
    createTicket,
    updateTicket,
    deleteTicket,
    mergeTickets,
    sendRatingRequest,
    getReport,
    queryAuditLog,
    manageRules,
    manageMacros,
    manageAgents,
    manageTeams,
    manageTags,
    manageCannedResponses,
    manageCustomFields
  ],
  triggers: [ticketEventsTrigger]
});
