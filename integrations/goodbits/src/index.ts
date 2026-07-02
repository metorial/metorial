import { Slate } from 'slates';
import { spec } from './spec';
import {
  addSubscriber,
  createContentLink,
  getEmailAnalytics,
  getNewsletter,
  getSubscriberCounts,
  listSentEmails,
  updateSubscriberStatus
} from './tools';
import { inboundWebhook, newSentEmail } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getNewsletter,
    addSubscriber,
    updateSubscriberStatus,
    getSubscriberCounts,
    createContentLink,
    listSentEmails,
    getEmailAnalytics
  ],
  triggers: [inboundWebhook, newSentEmail]
});
