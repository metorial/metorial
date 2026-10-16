import { Slate } from 'slates';
import { spec } from './spec';
import {
  createLink,
  deleteLink,
  downloadQrCode,
  getAnalytics,
  getLink,
  getMetatags,
  listCustomers,
  listEvents,
  listLinks,
  manageCustomer,
  manageDomains,
  manageFolders,
  manageTags,
  trackLead,
  trackSale,
  updateLink,
  upsertLink,
  whoAmI
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
    listEvents,
    whoAmI,
    manageFolders,
    manageCustomer,
    downloadQrCode
  ],
  triggers: []
});
