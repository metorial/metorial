import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  deleteRows,
  describeTable,
  executeQuery,
  insertRows,
  listSchemas,
  listTables,
  manageIndexes,
  manageRoles,
  manageSchemas,
  manageTable,
  manageViews,
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
    manageTable,
    manageIndexes,
    listSchemas,
    manageRoles,
    manageSchemas,
    manageViews
  ],
  triggers: [inboundWebhook, tableChanges]
});
