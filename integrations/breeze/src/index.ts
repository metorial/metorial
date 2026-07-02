import { Slate } from 'slates';
import { spec } from './spec';
import {
  addContribution,
  assignTag,
  createEvent,
  createPerson,
  deleteEvent,
  deletePerson,
  getAccount,
  getEvent,
  getPerson,
  listAttendance,
  listEvents,
  listFormEntries,
  listForms,
  listPeople,
  listProfileFields,
  listTags,
  manageAttendance,
  manageFamily,
  manageTag,
  manageVolunteerRoles,
  manageVolunteers,
  queryAccountLog,
  removeFormEntry,
  updatePerson
} from './tools';
import { accountChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listPeople,
    getPerson,
    createPerson,
    updatePerson,
    deletePerson,
    listProfileFields,
    manageFamily,
    listTags,
    manageTag,
    assignTag,
    listEvents,
    getEvent,
    createEvent,
    deleteEvent,
    manageAttendance,
    listAttendance,
    addContribution,
    listForms,
    listFormEntries,
    removeFormEntry,
    manageVolunteers,
    manageVolunteerRoles,
    getAccount,
    queryAccountLog
  ],
  triggers: [inboundWebhook, accountChanges]
});
