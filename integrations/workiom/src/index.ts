import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  createWebhookSubscription,
  deleteRecord,
  deleteWebhookSubscription,
  getApps,
  getListMetadata,
  getWebhookSubscription,
  listWebhookSubscriptions,
  queryRecords,
  updateRecord,
  updateWebhookSubscription
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getApps,
    getListMetadata,
    queryRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    listWebhookSubscriptions,
    createWebhookSubscription,
    deleteWebhookSubscription,
    getWebhookSubscription,
    updateWebhookSubscription
  ],
  triggers: []
});
