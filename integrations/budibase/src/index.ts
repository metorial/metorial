import { Slate } from 'slates';
import { spec } from './spec';
import {
  executeQuery,
  manageApplication,
  manageRow,
  manageTable,
  manageUser,
  publishApplication,
  searchApplications,
  searchQueries,
  searchRows,
  searchTables,
  searchUsers
} from './tools';
import { inboundWebhook, rowChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchApplications,
    manageApplication,
    publishApplication,
    searchTables,
    manageTable,
    searchRows,
    manageRow,
    searchUsers,
    manageUser,
    searchQueries,
    executeQuery
  ],
  triggers: [inboundWebhook, rowChanges]
});
