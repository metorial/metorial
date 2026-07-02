import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAppointmentSlots,
  getMessages,
  listLocations,
  manageAppointment,
  manageBroadcast,
  manageClass,
  manageClassParticipants,
  manageClient,
  manageClientTags,
  manageContact,
  manageContactTags,
  manageSegment,
  manageService,
  manageServiceCategory,
  manageStaff,
  searchAppointments,
  searchClasses,
  searchClients,
  searchContacts,
  sendMessage
} from './tools';
import {
  appointmentUpdate,
  classParticipantUpdate,
  clientEvent,
  contactEvent,
  invoiceUpdate,
  messageReceived,
  messageSent
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageClient,
    searchClients,
    manageClientTags,
    manageContact,
    searchContacts,
    manageContactTags,
    sendMessage,
    getMessages,
    manageSegment,
    manageBroadcast,
    manageAppointment,
    searchAppointments,
    getAppointmentSlots,
    manageClass,
    searchClasses,
    manageClassParticipants,
    manageService,
    manageServiceCategory,
    manageStaff,
    listLocations
  ],
  triggers: [
    messageReceived,
    messageSent,
    clientEvent,
    contactEvent,
    appointmentUpdate,
    classParticipantUpdate,
    invoiceUpdate
  ]
});
