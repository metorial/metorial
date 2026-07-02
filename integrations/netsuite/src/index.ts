import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecord,
  getRecord,
  getRecordMetadata,
  listRecords,
  querySuiteQL,
  transformRecord,
  updateRecord,
  upsertRecord
} from './tools';
import { inboundWebhook, recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    upsertRecord,
    listRecords,
    querySuiteQL,
    transformRecord,
    getRecordMetadata
  ],
  triggers: [inboundWebhook, recordChanges]
});
