import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchModifyEvents,
  createEvent,
  deleteEvent,
  findFreeBusy,
  getColors,
  getEvent,
  getSettings,
  listCalendars,
  listEvents,
  manageCalendar,
  manageSharing,
  quickAddEvent,
  respondToEvent,
  updateEvent
} from './tools';
import { calendarListChanges, eventChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createEvent,
    listEvents,
    getEvent,
    respondToEvent,
    updateEvent,
    batchModifyEvents,
    deleteEvent,
    quickAddEvent,
    listCalendars,
    manageCalendar,
    findFreeBusy,
    manageSharing,
    getColors,
    getSettings
  ],
  triggers: [eventChanges, calendarListChanges]
});
