import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRow,
  deleteRow,
  exportCsv,
  getAuditLogs,
  getRows,
  listConnections,
  listTables,
  manageActionRules,
  manageCompanyUsers,
  manageConnection,
  manageDashboards,
  manageGroups,
  manageSavedQueries,
  manageTableSettings,
  updateRow
} from './tools';
import { inboundWebhook, tableRowChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listConnections,
    manageConnection,
    listTables,
    getRows,
    addRow,
    updateRow,
    deleteRow,
    manageGroups,
    manageDashboards,
    manageSavedQueries,
    getAuditLogs,
    manageCompanyUsers,
    manageActionRules,
    manageTableSettings,
    exportCsv
  ],
  triggers: [inboundWebhook, tableRowChanges]
});
