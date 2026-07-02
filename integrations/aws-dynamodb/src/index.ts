import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchGetItems,
  batchWriteItems,
  createTable,
  deleteItem,
  deleteTable,
  describeTable,
  executePartiql,
  getItem,
  listTables,
  manageBackups,
  manageTtl,
  putItem,
  queryItems,
  scanItems,
  transactWrite,
  updateItem,
  updateTable
} from './tools';
import { inboundWebhook, streamChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTable,
    describeTable,
    listTables,
    deleteTable,
    updateTable,
    putItem,
    getItem,
    updateItem,
    deleteItem,
    queryItems,
    scanItems,
    executePartiql,
    batchWriteItems,
    batchGetItems,
    transactWrite,
    manageTtl,
    manageBackups
  ],
  triggers: [inboundWebhook, streamChanges]
});
