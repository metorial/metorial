import { Slate } from 'slates';
import { spec } from './spec';
import {
  getEvent,
  getOrder,
  getTag,
  getTicket,
  listEvents,
  listOrders,
  listTags,
  listTickets,
  manageTicketCheckIn
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listEvents,
    getEvent,
    listOrders,
    getOrder,
    listTickets,
    listTags,
    getTicket,
    getTag,
    manageTicketCheckIn
  ],
  triggers: []
});
