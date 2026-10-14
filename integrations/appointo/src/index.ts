import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelBooking,
  createBooking,
  getAvailability,
  listAppointments,
  listBookings,
  listCancelledBookings,
  listProducts,
  listSubscriptionContracts,
  rescheduleBooking,
  updateAppointmentConfig,
  updateBooking
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    listBookings,
    listCancelledBookings,
    createBooking,
    rescheduleBooking,
    cancelBooking,
    updateBooking,
    listAppointments,
    getAvailability,
    updateAppointmentConfig,
    listSubscriptionContracts
  ],
  triggers: []
});
