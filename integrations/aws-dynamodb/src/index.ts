import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchGetItems,
  batchWriteItems,
  createTable,
  deleteItem,
  deleteTable,
  describeBackup,
  describeStream,
  describeTable,
  executePartiql,
  getItem,
  getStreamRecords,
  listStreams,
  listTables,
  manageBackups,
  manageTtl,
  putItem,
  queryItems,
  restoreTableFromBackup,
  scanItems,
  transactGetItems,
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
    transactGetItems,
    transactWrite,
    listStreams,
    describeStream,
    getStreamRecords,
    manageTtl,
    manageBackups,
    describeBackup,
    restoreTableFromBackup
  ],
  triggers: [inboundWebhook, streamChanges]
});
