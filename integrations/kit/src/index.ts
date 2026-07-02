import { Slate } from 'slates';
import { spec } from './spec';
import {
  addSubscriberToForm,
  createSubscriber,
  getAccount,
  getBroadcastStats,
  getSubscriber,
  listEmailTemplates,
  listForms,
  listSegments,
  listSubscribers,
  manageBroadcasts,
  manageCustomFields,
  managePurchases,
  manageSequences,
  manageTags,
  tagSubscriber,
  unsubscribe,
  updateSubscriber
} from './tools';
import { formSubscribeEvent, purchaseEvent, subscriberEvent, tagEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccount,
    listSubscribers,
    getSubscriber,
    createSubscriber,
    updateSubscriber,
    unsubscribe,
    manageTags,
    tagSubscriber,
    manageCustomFields,
    listForms,
    addSubscriberToForm,
    manageBroadcasts,
    getBroadcastStats,
    manageSequences,
    listSegments,
    managePurchases,
    listEmailTemplates
  ],
  triggers: [subscriberEvent, tagEvent, purchaseEvent, formSubscribeEvent]
});
