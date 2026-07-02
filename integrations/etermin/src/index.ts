import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAppointment,
  createContact,
  createService,
  createVoucher,
  deleteAppointment,
  deleteContact,
  deleteService,
  getAppointment,
  getAvailableTimeSlots,
  getCompanyInfo,
  getWorkingTimes,
  listAppointments,
  listCalendars,
  listContacts,
  listServiceGroups,
  listServices,
  listVouchers,
  updateAppointment,
  updateContact,
  updateService
} from './tools';
import { appointmentEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAppointments,
    getAppointment,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    listContacts,
    createContact,
    updateContact,
    deleteContact,
    listCalendars,
    getAvailableTimeSlots,
    getWorkingTimes,
    listServices,
    createService,
    updateService,
    deleteService,
    listServiceGroups,
    createVoucher,
    listVouchers,
    getCompanyInfo
  ],
  triggers: [appointmentEvent]
});
