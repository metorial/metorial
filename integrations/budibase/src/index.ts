import { Slate } from 'slates';
import { spec } from './spec';
import {
  executeQuery,
  exportApplication,
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
    executeQuery,
    exportApplication
  ],
  triggers: []
});
