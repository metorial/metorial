import { Slate } from 'slates';
import { spec } from './spec';
import {
  addComment,
  createRecord,
  deleteRecord,
  executeActionButton,
  exportRecord,
  getFileUrl,
  getRecord,
  getSheetSchema,
  listActionButtons,
  listRecords,
  lockRecord,
  updateRecord,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listRecords,
    getRecord,
    getSheetSchema,
    createRecord,
    updateRecord,
    deleteRecord,
    addComment,
    lockRecord,
    executeActionButton,
    listActionButtons,
    exportRecord,
    getFileUrl,
    uploadFile
  ],
  triggers: []
});
