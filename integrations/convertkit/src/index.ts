import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPurchase,
  getAccount,
  listEmailTemplates,
  listSegments,
  listSubscribers,
  manageBroadcasts,
  manageCustomFields,
  manageForms,
  manageSequences,
  manageSubscriber,
  manageTags
} from './tools';
import {
  formSubscriptionEvent,
  linkClickEvent,
  productPurchaseEvent,
  purchaseEvent,
  sequenceEvent,
  subscriberEvent,
  tagEvent
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccount.build(),
    listSubscribers.build(),
    manageSubscriber.build(),
    manageTags.build(),
    manageForms.build(),
    manageSequences.build(),
    manageBroadcasts.build(),
    manageCustomFields.build(),
    createPurchase.build(),
    listSegments.build(),
    listEmailTemplates.build()
  ],
  triggers: [
    subscriberEvent.build(),
    tagEvent.build(),
    formSubscriptionEvent.build(),
    sequenceEvent.build(),
    purchaseEvent.build(),
    linkClickEvent.build(),
    productPurchaseEvent.build()
  ]
});
