import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecords,
  executeMethod,
  listModelFields,
  listModels,
  readRecords,
  searchRecords,
  updateRecords
} from './tools';
import { inboundWebhook, recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchRecords,
    readRecords,
    createRecord,
    updateRecords,
    deleteRecords,
    listModelFields,
    listModels,
    executeMethod
  ],
  triggers: [inboundWebhook, recordChanges]
});
