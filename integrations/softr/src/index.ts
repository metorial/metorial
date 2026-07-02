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
  manageDatabase,
  manageTable,
  manageTableField,
  searchRecords,
  syncUsers,
  updateRecord,
  validateToken
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

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
    manageTable,
    manageTableField,
    getRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    searchRecords
  ],
  triggers: [inboundWebhook]
});
