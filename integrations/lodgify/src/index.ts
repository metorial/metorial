import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBooking,
  getAvailability,
  getBooking,
  getProperty,
  getQuote,
  getRates,
  listBookings,
  listProperties,
  managePaymentLink,
  sendMessage,
  updateAvailability,
  updateBookingStatus,
  updateRates
} from './tools';
import {
  availabilityChanges,
  bookingChanges,
  guestMessageReceived,
  rateChanges
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProperties,
    getProperty,
    listBookings,
    getBooking,
    createBooking,
    updateBookingStatus,
    getAvailability,
    updateAvailability,
    getRates,
    updateRates,
    getQuote,
    managePaymentLink,
    sendMessage
  ],
  triggers: [bookingChanges, availabilityChanges, rateChanges, guestMessageReceived]
});
