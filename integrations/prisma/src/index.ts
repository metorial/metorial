import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConnection,
  createDatabase,
  createProject,
  deleteConnection,
  deleteDatabase,
  getDatabase,
  getDatabaseBackups,
  getDatabaseUsage,
  getProject,
  listConnections,
  listDatabases,
  listWorkspaces,
  transferProject
} from './tools';
import { databaseChanges, inboundWebhook } from './triggers';

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
    getDatabaseUsage
  ],
  triggers: [inboundWebhook, databaseChanges]
});
