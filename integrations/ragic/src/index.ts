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
  listActionButtons,
  listRecords,
  lockRecord,
  updateRecord
} from './tools';
import { recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    addComment,
    lockRecord,
    executeActionButton,
    listActionButtons,
    exportRecord,
    getFileUrl
  ],
  triggers: [recordChanges]
});
