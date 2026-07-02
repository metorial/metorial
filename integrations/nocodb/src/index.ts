import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecords,
  createTable,
  deleteRecords,
  getRecord,
  getTable,
  linkRecords,
  listBases,
  listRecords,
  listTables,
  listViews,
  manageField,
  manageWebhook,
  updateRecords
} from './tools';
import { recordEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRecords,
    getRecord,
    createRecords,
    updateRecords,
    deleteRecords,
    listBases,
    listTables,
    getTable,
    createTable,
    manageField,
    listViews,
    manageWebhook,
    linkRecords
  ],
  triggers: [recordEvent]
});
