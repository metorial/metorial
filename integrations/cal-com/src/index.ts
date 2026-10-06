import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBooking,
  createEventType,
  deleteEventType,
  getAvailableSlots,
  getBooking,
  getBusyTimes,
  getEventType,
  getProfile,
  listBookings,
  listCalendars,
  listEventTypes,
  manageBooking,
  manageOutOfOffice,
  manageSchedule,
  manageSlotReservation,
  updateEventType
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listBookings,
    getBooking,
    createBooking,
    manageBooking,
    listEventTypes,
    getEventType,
    createEventType,
    updateEventType,
    deleteEventType,
    manageSchedule,
    getAvailableSlots,
    manageSlotReservation,
    manageOutOfOffice,
    getProfile,
    listCalendars,
    getBusyTimes
  ],
  triggers: []
});
