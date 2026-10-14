import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountInfo,
  getCourseCompletions,
  getRequestStatus,
  listInvoices,
  listSegments,
  listTags,
  manageAdministrator,
  manageBroadcast,
  manageContact,
  manageListSubscription,
  manageProduct,
  startAutomation,
  tagContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageContact,
    tagContact,
    manageListSubscription,
    manageProduct,
    listInvoices,
    manageAdministrator,
    manageBroadcast,
    getCourseCompletions,
    startAutomation,
    listTags,
    getAccountInfo,
    getRequestStatus,
    listSegments
  ],
  triggers: []
});
