import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDatabase,
  createDatabaseToken,
  createGroup,
  createGroupToken,
  deleteDatabase,
  deleteGroup,
  getDatabase,
  getGroup,
  getOrganization,
  invalidateDatabaseTokens,
  invalidateGroupTokens,
  listAuditLogs,
  listDatabases,
  listGroups,
  listLocations,
  manageApiTokens,
  manageGroupLocations,
  manageMembers,
  transferGroup,
  unarchiveGroup,
  updateDatabaseConfiguration
} from './tools';
import { auditLogActivity, databaseChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listDatabases,
    createDatabase,
    getDatabase,
    deleteDatabase,
    updateDatabaseConfiguration,
    createDatabaseToken,
    invalidateDatabaseTokens,
    listGroups,
    createGroup,
    getGroup,
    deleteGroup,
    manageGroupLocations,
    createGroupToken,
    invalidateGroupTokens,
    transferGroup,
    unarchiveGroup,
    listLocations,
    getOrganization,
    manageMembers,
    manageApiTokens,
    listAuditLogs
  ],
  triggers: [inboundWebhook, auditLogActivity, databaseChanges]
});
