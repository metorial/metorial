import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRow,
  deleteRow,
  exportCsv,
  getAuditLogs,
  getCurrentUser,
  getMyCompany,
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
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getMyCompany,
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
  triggers: []
});
