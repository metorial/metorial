import { Slate } from 'slates';
import { spec } from './spec';
import {
  countRecords,
  createBase,
  createRecords,
  createTable,
  deleteBase,
  deleteRecords,
  deleteTable,
  getBase,
  getField,
  getRecord,
  getTable,
  linkRecords,
  listBases,
  listRecords,
  listTables,
  listViews,
  manageField,
  manageWebhook,
  updateBase,
  updateRecords,
  updateTable
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    countRecords,
    createBase,
    deleteBase,
    getBase,
    updateBase,
    updateTable,
    deleteTable,
    getField,
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
  triggers: []
});
