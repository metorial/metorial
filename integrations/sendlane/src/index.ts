import { Slate } from 'slates';
import { spec } from './spec';
import {
  addContactToList,
  getContact,
  listCampaigns,
  listContacts,
  listCustomFields,
  listListContacts,
  listLists,
  listSenders,
  listTags,
  manageContactTags,
  manageSuppression,
  removeContactFromList,
  trackCheckout,
  trackCustomEvent,
  trackOrder,
  trackOrderFulfilled,
  unsubscribeContact,
  updateContactCustomFields,
  updateSmsConsent
} from './tools';
import { inboundWebhook, newContact, newUnsubscribe } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    getContact,
    addContactToList,
    removeContactFromList,
    unsubscribeContact,
    listLists,
    listListContacts,
    listTags,
    manageContactTags,
    listCampaigns,
    listCustomFields,
    updateContactCustomFields,
    listSenders,
    updateSmsConsent,
    manageSuppression,
    trackOrder,
    trackCheckout,
    trackOrderFulfilled,
    trackCustomEvent
  ],
  triggers: [inboundWebhook, newContact, newUnsubscribe]
});
