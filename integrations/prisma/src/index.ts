import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConnection,
  createDatabase,
  createProject,
  deleteConnection,
  deleteDatabase,
  deleteProject,
  getCurrentUser,
  getDatabase,
  getDatabaseBackups,
  getDatabaseUsage,
  getProject,
  listConnections,
  listDatabases,
  listProjects,
  listRegions,
  listWorkspaces,
  transferProject
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listWorkspaces,
    createProject,
    getProject,
    transferProject,
    listDatabases,
    getDatabase,
    createDatabase,
    deleteDatabase,
    listConnections,
    createConnection,
    deleteConnection,
    getDatabaseBackups,
    getDatabaseUsage,
    getCurrentUser,
    listProjects,
    listRegions,
    deleteProject
  ],
  triggers: []
});
