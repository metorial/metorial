import { Slate } from 'slates';
import { spec } from './spec';
import {
  compositeRequest,
  createRecord,
  deleteRecord,
  describeObject,
  getOrgLimits,
  getRecord,
  getUserInfo,
  manageBulkJob,
  manageChatter,
  queryRecords,
  runReport,
  searchRecords,
  updateRecord,
  upsertRecord
} from './tools';
import { inboundWebhook, newRecord, recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    upsertRecord,
    queryRecords,
    searchRecords,
    describeObject,
    manageBulkJob,
    compositeRequest,
    runReport,
    getOrgLimits,
    getUserInfo,
    manageChatter
  ],
  triggers: [inboundWebhook, recordChanges, newRecord]
});
