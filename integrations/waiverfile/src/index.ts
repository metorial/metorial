import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEvent,
  deleteEvent,
  getSiteDetails,
  getWaiver,
  getWaiverDataCount,
  getWaiverForms,
  getWaiversForEvent,
  listCompleteWaivers,
  listEvents,
  listWaiversByDate,
  manageEventCategories,
  manageEventManagers,
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
    listWaiversByDate,
    listCompleteWaivers,
    getWaiverDataCount,
    manageEventManagers
  ],
  triggers: []
});
