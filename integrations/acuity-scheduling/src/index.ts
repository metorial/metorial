import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelAppointment,
  checkAvailability,
  checkCertificate,
  createAppointment,
  createBlock,
  createCertificate,
  createClient,
  deleteBlock,
  deleteCertificate,
  deleteClient,
  getAccount,
  getAppointment,
  getAppointmentPayments,
  listAppointments,
  listAppointmentTypes,
  listBlocks,
  listCalendars,
  listClients,
  listForms,
  listLabels,
  listOrders,
  listProducts,
  rescheduleAppointment,
  updateAppointment,
  updateClient
} from './tools';
import { appointmentEvents, orderEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAppointments,
    getAppointment,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    rescheduleAppointment,
    getAppointmentPayments,
    checkAvailability,
    createBlock,
    listBlocks,
    deleteBlock,
    listCalendars,
    listClients,
    createClient,
    updateClient,
    deleteClient,
    listAppointmentTypes,
    listForms,
    createCertificate,
    checkCertificate,
    deleteCertificate,
    listProducts,
    listOrders,
    listLabels,
    getAccount
  ],
  triggers: [appointmentEvents, orderEvents]
});
