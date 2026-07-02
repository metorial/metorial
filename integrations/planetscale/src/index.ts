import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBranch,
  createDatabase,
  createDeployRequest,
  deleteDatabase,
  getDatabase,
  getOrganization,
  listAuditLogs,
  listBranches,
  listDatabases,
  listDeployRequests,
  listMembers,
  manageBackup,
  manageBranch,
  manageDeployRequest,
  managePassword,
  manageWebhook,
  updateDatabase
} from './tools';
import { branchEvents, deployRequestEvents, storageEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listDatabases,
    getDatabase,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    listBranches,
    createBranch,
    manageBranch,
    listDeployRequests,
    createDeployRequest,
    manageDeployRequest,
    managePassword,
    manageBackup,
    manageWebhook,
    getOrganization,
    listMembers,
    listAuditLogs
  ] as any,
  triggers: [branchEvents, deployRequestEvents, storageEvents] as any
});
