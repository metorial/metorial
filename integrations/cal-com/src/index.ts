import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBooking,
  createEventType,
  deleteEventType,
  getAvailableSlots,
  getBooking,
  getBusyTimes,
  getProfile,
  listBookings,
  listCalendars,
  listEventTypes,
  manageBooking,
  manageSchedule,
  updateEventType
} from './tools';
import { bookingEvents, formEvents, meetingEvents, noShowEvents, oooEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listBookings,
    getBooking,
    createBooking,
    manageBooking,
    listEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    manageSchedule,
    getAvailableSlots,
    getProfile,
    listCalendars,
    getBusyTimes
  ],
  triggers: [bookingEvents, meetingEvents, noShowEvents, formEvents, oooEvents]
});
