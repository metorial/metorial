import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteRows,
  describeTable,
  executeQuery,
  insertRows,
  listDatabases,
  listTables,
  manageDatabase,
  manageIndexes,
  manageTable,
  manageUsers,
  updateRows
} from './tools';
import { inboundWebhook, tableChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    executeQuery,
    listTables,
    describeTable,
    insertRows,
    updateRows,
    deleteRows,
    manageDatabase,
    manageTable,
    manageIndexes,
    listDatabases,
    manageUsers
  ],
  triggers: [inboundWebhook, tableChanges]
});
