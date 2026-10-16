import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecord,
  getAppMetadata,
  getRecord,
  getRecordFile,
  getRecords,
  updateRecord,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getRecords,
    getRecord,
    getRecordFile,
    createRecord,
    updateRecord,
    deleteRecord,
    getAppMetadata,
    uploadFile
  ],
  triggers: []
});
