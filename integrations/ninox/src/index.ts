import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecords,
  deleteFile,
  deleteRecords,
  downloadFile,
  executeQuery,
  executeScript,
  getChanges,
  getDatabaseSchema,
  getRecord,
  getTableSchema,
  listDatabases,
  listFiles,
  listRecords,
  listTeams,
  listViews,
  updateRecord,
  upsertRecords
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTeams,
    listDatabases,
    getDatabaseSchema,
    getTableSchema,
    listRecords,
    getRecord,
    createRecords,
    updateRecord,
    deleteRecords,
    executeQuery,
    executeScript,
    listFiles,
    deleteFile,
    listViews,
    downloadFile,
    upsertRecords,
    getChanges
  ],
  triggers: []
});
