import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createContactRecord,
  createOpportunity,
  createTask,
  findTask,
  getNotifications,
  listUsers,
  logTime
} from './tools';
import { inboundWebhook, newTaskCreated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    createOpportunity,
    createTask,
    findTask,
    logTime,
    listUsers,
    getNotifications,
    createContactRecord
  ],
  triggers: [inboundWebhook, newTaskCreated]
});
