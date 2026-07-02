import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlEndpoint,
  createBranch,
  createDatabase,
  createEndpoint,
  createProject,
  createRole,
  deleteBranch,
  deleteDatabase,
  deleteEndpoint,
  deleteProject,
  deleteRole,
  getConsumption,
  getOperation,
  getProject,
  listBranches,
  listDatabases,
  listEndpoints,
  listOperations,
  listProjects,
  listRoles,
  resetRolePassword,
  restoreBranch,
  updateDatabase,
  updateEndpoint,
  updateProject
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    listBranches,
    createBranch,
    deleteBranch,
    restoreBranch,
    listDatabases,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    listEndpoints,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    controlEndpoint,
    listRoles,
    createRole,
    deleteRole,
    resetRolePassword,
    listOperations,
    getOperation,
    getConsumption
  ],
  triggers: [inboundWebhook]
});
