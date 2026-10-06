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
  triggers: []
});
