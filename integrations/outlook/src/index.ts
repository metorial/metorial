import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createDraft,
  createEvent,
  createTask,
  findMeetingTimes,
  getContact,
  getEvent,
  getMessage,
  getMyProfile,
  listCalendars,
  listContacts,
  listEvents,
  listMailFolders,
  listMessages,
  listTaskLists,
  listTasks,
  manageContact,
  manageEvent,
  manageMessage,
  manageTask,
  sendMessage
} from './tools';
import { contactChanges, eventChanges, messageChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    getMyProfile,
    listMessages,
    getMessage,
    manageMessage,
    createDraft,
    listMailFolders,
    listEvents,
    getEvent,
    createEvent,
    manageEvent,
    findMeetingTimes,
    listCalendars,
    listContacts,
    getContact,
    createContact,
    manageContact,
    listTaskLists,
    listTasks,
    createTask,
    manageTask
  ],
  triggers: [messageChanges, eventChanges, contactChanges]
});
