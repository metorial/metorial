import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecords,
  executeCoql,
  getModuleMetadata,
  getOrganization,
  getRecord,
  getRecords,
  getRelatedRecords,
  getUsers,
  manageAttachments,
  manageNotes,
  manageTags,
  searchRecords,
  sendEmail,
  updateRecord
} from './tools';
import { recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecords,
    searchRecords,
    executeCoql,
    getUsers,
    getModuleMetadata,
    manageAttachments,
    manageNotes,
    manageTags,
    getRelatedRecords,
    sendEmail,
    getOrganization
  ],
  triggers: [recordChanges]
});
