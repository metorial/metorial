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
  triggers: []
});
