import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBooking,
  listBookingCalendars,
  listBookingPages,
  listBookings,
  listEventTypes,
  listTeams,
  listUsers
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listBookings,
    getBooking,
    listBookingCalendars,
    listBookingPages,
    listEventTypes,
    listUsers,
    listTeams
  ],
  triggers: []
});
