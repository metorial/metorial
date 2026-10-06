import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkCreateRecords,
  createRecord,
  deleteRecord,
  exportRecords,
  getApiSpec,
  getRecord,
  replaceRecord,
  searchRecords,
  triggerWorkflow,
  updateRecord
} from './tools';
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
    getApiSpec,
    exportRecords
  ],
  triggers: []
});
