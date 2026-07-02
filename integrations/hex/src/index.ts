import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelRun,
  createEmbeddingUrl,
  createProject,
  deactivateUser,
  deleteGroup,
  getDataConnection,
  getProject,
  getQueriedTables,
  getRunStatus,
  listCollections,
  listDataConnections,
  listGroups,
  listProjectRuns,
  listProjects,
  listUsers,
  manageCollection,
  manageGroup,
  manageProjectSharing,
  runProject,
  updateProjectStatus
} from './tools';
import { inboundWebhook, newProject, projectRunCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    createProject,
    updateProjectStatus,
    runProject,
    getRunStatus,
    cancelRun,
    listProjectRuns,
    manageProjectSharing,
    createEmbeddingUrl,
    listUsers,
    deactivateUser,
    manageGroup,
    listGroups,
    deleteGroup,
    manageCollection,
    listCollections,
    listDataConnections,
    getDataConnection,
    getQueriedTables
  ],
  triggers: [inboundWebhook, projectRunCompleted, newProject]
});
