import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEvent,
  getEvent,
  getOrder,
  getUser,
  listAttendees,
  listEvents,
  listOrders,
  manageDiscount,
  manageOrganizer,
  manageTicketClass,
  manageVenue,
  publishEvent,
  updateEvent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getEvent,
    listEvents,
    createEvent,
    updateEvent,
    publishEvent,
    manageTicketClass,
    listOrders,
    getOrder,
    listAttendees,
    manageVenue,
    manageDiscount,
    manageOrganizer,
    getUser
  ],
  triggers: []
});
