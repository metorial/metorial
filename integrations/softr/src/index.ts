import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  createUser,
  deleteRecord,
  deleteUser,
  generateMagicLink,
  getRecords,
  listDatabases,
  listTables,
  listTableViews,
  manageDatabase,
  manageTable,
  manageTableField,
  manageUserLifecycle,
  searchRecords,
  syncUsers,
  updateRecord,
  validateToken
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    createUser,
    deleteUser,
    generateMagicLink,
    syncUsers,
    validateToken,
    listDatabases,
    manageDatabase,
    listTables,
    listTableViews,
    manageUserLifecycle,
    manageTable,
    manageTableField,
    getRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    searchRecords
  ],
  triggers: []
});
