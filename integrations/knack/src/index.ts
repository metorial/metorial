import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecord,
  getAppMetadata,
  getRecord,
  getRecords,
  updateRecord,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    getAppMetadata,
    uploadFile
  ],
  triggers: []
});
