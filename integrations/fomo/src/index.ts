import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEvent,
  createTemplate,
  deleteEvent,
  getEvent,
  getOpenMetrics,
  getStatistics,
  listEvents,
  searchEvent,
  updateApplication,
  updateEvent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createEvent,
    getEvent,
    listEvents,
    searchEvent,
    updateEvent,
    deleteEvent,
    createTemplate,
    getStatistics,
    updateApplication,
    getOpenMetrics
  ],
  triggers: []
});
