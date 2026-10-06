import { Slate } from 'slates';
import { spec } from './spec';
import {
  createJob,
  getWorkflowData,
  listWebhooks,
  subscribeWebhook,
  unsubscribeWebhook
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [getWorkflowData, createJob, listWebhooks, subscribeWebhook, unsubscribeWebhook],
  triggers: []
});
