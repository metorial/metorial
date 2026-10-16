import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEvent,
  getAttendee,
  getEvent,
  getEventDescription,
  getOrder,
  getUser,
  listAttendees,
  listEvents,
  listOrders,
  manageDiscount,
  manageEvent,
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
    getAttendee,
    getEventDescription,
    manageEvent,
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
