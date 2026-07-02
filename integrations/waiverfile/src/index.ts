import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEvent,
  deleteEvent,
  getSiteDetails,
  getWaiver,
  getWaiverForms,
  getWaiversForEvent,
  listEvents,
  listWaiversByDate,
  manageEventCategories,
  searchWaivers,
  updateEvent
} from './tools';
import { eventTrigger, waiverTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getSiteDetails,
    getWaiver,
    searchWaivers,
    getWaiverForms,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    manageEventCategories,
    getWaiversForEvent,
    listWaiversByDate
  ],
  triggers: [waiverTrigger, eventTrigger]
});
