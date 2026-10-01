import { createRecord } from './tools/create-record';
import { deleteRecords } from './tools/delete-records';
import { executeCoql } from './tools/execute-coql';
import { getModuleMetadata } from './tools/get-module-metadata';
import { getOrganization } from './tools/get-organization';
import { getRecord } from './tools/get-record';
import { getRecords } from './tools/get-records';
import { getRelatedRecords } from './tools/get-related-records';
import { getUsers } from './tools/get-users';
import { manageAttachments } from './tools/manage-attachments';
import { manageNotes } from './tools/manage-notes';
import { manageTags } from './tools/manage-tags';
import { searchRecords } from './tools/search-records';
import { sendEmail } from './tools/send-email';
import { updateRecord } from './tools/update-record';

export let crmTools = [
  getRecords,
  searchRecords,
  getModuleMetadata,
  getUsers,
  getOrganization,
  manageTags,
  getRecord,
  createRecord,
  deleteRecords,
  manageNotes,
  manageAttachments,
  sendEmail,
  getRelatedRecords,
  updateRecord,
  executeCoql
];
