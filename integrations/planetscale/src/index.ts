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
  listClusterSizes,
  listDatabases,
  listDeployRequests,
  listMembers,
  listRegions,
  manageBackup,
  manageBranch,
  manageDeployRequest,
  managePassword,
  manageServiceToken,
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
    listRegions,
    listClusterSizes,
    createBranch,
    manageBranch,
    listDeployRequests,
    createDeployRequest,
    manageDeployRequest,
    managePassword,
    manageBackup,
    manageWebhook,
    manageServiceToken,
    getOrganization,
    listMembers,
    listAuditLogs
  ] as any,
  triggers: [branchEvents, deployRequestEvents, storageEvents] as any
});
