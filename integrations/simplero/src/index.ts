import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCourseCompletions,
  listInvoices,
  listTags,
  manageAdministrator,
  manageBroadcast,
  manageContact,
  manageListSubscription,
  manageProduct,
  startAutomation,
  tagContact
} from './tools';
import { purchaseEvents, subscriptionEvents, taggingEvents } from './triggers';

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
    listTags
  ],
  triggers: [subscriptionEvents, purchaseEvents, taggingEvents]
});
