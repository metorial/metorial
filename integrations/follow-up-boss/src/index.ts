import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteContact,
  enrollActionPlan,
  listDeals,
  listPipelines,
  listTasks,
  listUsers,
  logCall,
  manageAppointment,
  manageContact,
  manageDeal,
  manageNote,
  manageTask,
  searchContacts,
  sendEvent,
  sendTextMessage
} from './tools';
import {
  appointmentEvents,
  communicationEvents,
  dealEvents,
  emailMarketingEvents,
  noteEvents,
  peopleEvents,
  taskEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageContact,
    searchContacts,
    deleteContact,
    sendEvent,
    manageTask,
    manageNote,
    logCall,
    sendTextMessage,
    manageDeal,
    manageAppointment,
    listUsers,
    listDeals,
    listTasks,
    enrollActionPlan,
    listPipelines
  ],
  triggers: [
    peopleEvents,
    communicationEvents,
    taskEvents,
    dealEvents,
    appointmentEvents,
    noteEvents,
    emailMarketingEvents
  ]
});
