import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelBooking,
  createBooking,
  getAvailability,
  listAppointments,
  listBookings,
  listProducts,
  listSubscriptionContracts,
  rescheduleBooking,
  updateAppointmentConfig,
  updateBooking
} from './tools';
import { bookingEvents, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    listBookings,
    createBooking,
    rescheduleBooking,
    cancelBooking,
    updateBooking,
    listAppointments,
    getAvailability,
    updateAppointmentConfig,
    listSubscriptionContracts
  ],
  triggers: [inboundWebhook, bookingEvents]
});
