import { Slate } from 'slates';
import { spec } from './spec';
import {
  createLink,
  deleteLink,
  getAnalytics,
  getLink,
  getMetatags,
  listCustomers,
  listEvents,
  listLinks,
  manageDomains,
  manageTags,
  trackLead,
  trackSale,
  updateLink,
  upsertLink
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createLink,
    updateLink,
    getLink,
    listLinks,
    upsertLink,
    deleteLink,
    getAnalytics,
    trackLead,
    trackSale,
    manageTags,
    manageDomains,
    listCustomers,
    getMetatags,
    listEvents
  ],
  triggers: []
});
