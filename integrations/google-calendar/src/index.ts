import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchModifyEvents,
  createEvent,
  deleteEvent,
  findFreeBusy,
  getCalendar,
  getColors,
  getEvent,
  getSettings,
  listCalendarSharing,
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
    getCalendar,
    manageCalendar,
    findFreeBusy,
    listCalendarSharing,
    manageSharing,
    getColors,
    getSettings
  ],
  triggers: [eventChanges, calendarListChanges]
});
