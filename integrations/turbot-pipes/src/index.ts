import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConnection,
  createOrganization,
  createWorkspace,
  deleteConnection,
  deleteOrganization,
  deleteWorkspace,
  executeQuery,
  getActor,
  getOrganization,
  getProcess,
  getSnapshot,
  getWorkspace,
  listConnections,
  listOrganizations,
  listOrgMembers,
  listPipelines,
  listProcesses,
  listSnapshots,
  listWorkspaces,
  manageOrgMember,
  runPipeline,
  testConnection,
  updateConnection,
  updateOrganization,
  updateWorkspace
} from './tools';
import { inboundWebhook, processActivity } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getActor,
    listWorkspaces,
    getWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    executeQuery,
    listConnections,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    listOrganizations,
    getOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    listOrgMembers,
    manageOrgMember,
    listPipelines,
    runPipeline,
    listProcesses,
    getProcess,
    listSnapshots,
    getSnapshot
  ],
  triggers: [inboundWebhook, processActivity]
});
