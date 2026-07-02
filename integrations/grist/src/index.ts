import { Slate } from 'slates';
import { spec } from './spec';
import {
  addOrUpdateRecords,
  addRecords,
  createDocument,
  createTable,
  createWebhook,
  createWorkspace,
  deleteDocument,
  deleteRecords,
  deleteWebhook,
  deleteWorkspace,
  fetchRecords,
  getDocument,
  listAttachments,
  listColumns,
  listOrgs,
  listTables,
  listWebhooks,
  listWorkspaces,
  modifyColumns,
  runSql,
  updateDocument,
  updateRecords,
  updateWebhook
} from './tools';
import { rowChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrgs,
    listWorkspaces,
    createWorkspace,
    deleteWorkspace,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    listTables,
    createTable,
    listColumns,
    modifyColumns,
    fetchRecords,
    addRecords,
    updateRecords,
    addOrUpdateRecords,
    deleteRecords,
    runSql,
    listWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    listAttachments
  ],
  triggers: [rowChanges]
});
