import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkCreateRecords,
  createRecord,
  deleteRecord,
  getApiSpec,
  getRecord,
  replaceRecord,
  searchRecords,
  triggerWorkflow,
  updateRecord
} from './tools';
import { inboundWebhook, recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createRecord,
    getRecord,
    searchRecords,
    updateRecord,
    replaceRecord,
    deleteRecord,
    bulkCreateRecords,
    triggerWorkflow,
    getApiSpec
  ],
  triggers: [inboundWebhook, recordChanges]
});
