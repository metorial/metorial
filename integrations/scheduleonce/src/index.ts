import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelBooking,
  getAvailableTimeSlots,
  getBooking,
  listBookingCalendars,
  listBookingPages,
  listBookings,
  listEventTypes,
  listTeams,
  listUsers,
  whoAmI
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
    listTeams,
    whoAmI,
    cancelBooking,
    getAvailableTimeSlots
  ],
  triggers: []
});
