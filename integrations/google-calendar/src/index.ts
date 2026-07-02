import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEvent,
  deleteEvent,
  findFreeBusy,
  getColors,
  getEvent,
  listCalendars,
  listEvents,
  manageCalendar,
  manageSharing,
  quickAddEvent,
  updateEvent
} from './tools';
import { calendarListChanges, eventChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createEvent,
    listEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    quickAddEvent,
    listCalendars,
    manageCalendar,
    findFreeBusy,
    manageSharing,
    getColors
  ],
  triggers: [eventChanges, calendarListChanges]
});
