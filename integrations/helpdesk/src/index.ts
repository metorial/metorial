import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTicket,
  deleteTicket,
  getReport,
  getTicket,
  listLicenses,
  listTickets,
  listViews,
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
  sendTicketMessage,
  updateTicket
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTickets,
    listLicenses,
    listViews,
    sendTicketMessage,
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
  triggers: []
});
