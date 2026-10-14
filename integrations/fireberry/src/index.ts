import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecord,
  getFieldMetadata,
  getPicklistValues,
  getRecord,
  getRelatedRecords,
  listObjectFields,
  listObjects,
  listRecords,
  queryRecords,
  queryRecordsV3,
  updateRecord
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getRecord,
    listRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    queryRecords,
    queryRecordsV3,
    getRelatedRecords,
    listObjects,
    listObjectFields,
    getPicklistValues,
    getFieldMetadata
  ],
  triggers: []
});
