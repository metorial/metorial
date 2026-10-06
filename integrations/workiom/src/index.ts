import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  createWebhookSubscription,
  deleteRecord,
  deleteWebhookSubscription,
  getApps,
  getListMetadata,
  listWebhookSubscriptions,
  queryRecords,
  updateRecord
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
    deleteWebhookSubscription
  ],
  triggers: []
});
