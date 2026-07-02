import { Slate } from 'slates';
import { spec } from './spec';
import {
  addTableColumn,
  aggregateTable,
  askAi,
  createBranch,
  createDatabase,
  createRecord,
  createTable,
  deleteBranch,
  deleteDatabase,
  deleteRecord,
  deleteTable,
  executeTransaction,
  getBranch,
  getRecord,
  getTableSchema,
  listBranches,
  listDatabases,
  listTables,
  listWorkspaces,
  queryRecords,
  searchRecords,
  summarizeTable,
  updateRecord,
  vectorSearch
} from './tools';
import { inboundWebhook, recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    queryRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    searchRecords,
    vectorSearch,
    askAi,
    listBranches,
    createBranch,
    deleteBranch,
    getBranch,
    listDatabases,
    createDatabase,
    deleteDatabase,
    listWorkspaces,
    summarizeTable,
    aggregateTable,
    listTables,
    createTable,
    deleteTable,
    getTableSchema,
    addTableColumn,
    executeTransaction
  ],
  triggers: [inboundWebhook, recordChanges]
});
