import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteContact,
  deleteOrder,
  deleteSubscription,
  getContact,
  getCustomerJourney,
  getReport,
  identifyVisitor,
  manageTags,
  recordAdPerformance,
  upsertContact,
  upsertOrder,
  upsertProduct,
  upsertSubscription
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    upsertContact,
    deleteContact,
    manageTags,
    upsertOrder,
    deleteOrder,
    upsertSubscription,
    deleteSubscription,
    upsertProduct,
    recordAdPerformance,
    getReport,
    getCustomerJourney,
    getContact,
    identifyVisitor
  ],
  triggers: [inboundWebhook]
});
