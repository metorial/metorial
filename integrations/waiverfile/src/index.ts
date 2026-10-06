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
  triggers: []
});
