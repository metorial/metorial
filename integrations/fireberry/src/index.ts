import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecord,
  getPicklistValues,
  getRecord,
  getRelatedRecords,
  listObjectFields,
  listObjects,
  listRecords,
  queryRecords,
  updateRecord
} from './tools';
import { inboundWebhook, recordChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getRecord,
    listRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    queryRecords,
    getRelatedRecords,
    listObjects,
    listObjectFields,
    getPicklistValues
  ],
  triggers: [inboundWebhook, recordChanged]
});
