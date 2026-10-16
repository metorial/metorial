import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRows,
  deleteRows,
  getCurrentUser,
  getRow,
  listDatabases,
  listFields,
  listRows,
  listTables,
  listTokenTables,
  listViews,
  manageField,
  manageTable,
  manageView,
  moveRow,
  updateRows,
  uploadFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listTokenTables,
    moveRow,
    manageTable,
    manageView,
    listRows,
    getRow,
    createRows,
    updateRows,
    deleteRows,
    listTables,
    listFields,
    listViews,
    listDatabases,
    manageField,
    uploadFile
  ],
  triggers: []
});
