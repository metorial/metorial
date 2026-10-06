import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecord,
  getRecord,
  getRecordMetadata,
  listRecords,
  listRecordTypes,
  querySuiteQL,
  transformRecord,
  updateRecord,
  upsertRecord
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    upsertRecord,
    listRecords,
    listRecordTypes,
    querySuiteQL,
    transformRecord,
    getRecordMetadata
  ],
  triggers: []
});
