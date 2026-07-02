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
import { bookingEvents } from './triggers';

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
  triggers: [bookingEvents]
});
