import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkAvailability,
  createReservation,
  createUser,
  createVoucher,
  deleteReservation,
  getRentalPrice,
  getReservation,
  getResource,
  getResourceUsage,
  getSiteInfo,
  getUser,
  listPayments,
  listReservations,
  listResources,
  listUsers,
  listVouchers,
  modifyReservation,
  modifyUser,
  recordPayment,
  reservationAction
} from './tools';
import { paymentEvents, reservationEvents, resourceEvents, userEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createReservation,
    modifyReservation,
    reservationAction,
    deleteReservation,
    getReservation,
    listReservations,
    getResource,
    listResources,
    checkAvailability,
    getRentalPrice,
    getResourceUsage,
    recordPayment,
    listPayments,
    createUser,
    modifyUser,
    getUser,
    listUsers,
    createVoucher,
    listVouchers,
    getSiteInfo
  ],
  triggers: [reservationEvents, paymentEvents, userEvents, resourceEvents]
});
