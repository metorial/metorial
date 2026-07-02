import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAuthConfig,
  getProject,
  invokeRpc,
  listOrganizations,
  listProjects,
  manageAuthUsers,
  manageEdgeFunctions,
  manageProject,
  manageSecrets,
  manageStorageBuckets,
  manageStorageObjects,
  manageTableRows,
  queryTable,
  runQuery
} from './tools';
import { databaseChangesTrigger, databaseWebhookTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    manageProject,
    listOrganizations,
    runQuery,
    queryTable,
    manageTableRows,
    manageEdgeFunctions,
    manageSecrets,
    manageStorageBuckets,
    manageStorageObjects,
    manageAuthUsers,
    invokeRpc,
    getAuthConfig
  ],
  triggers: [databaseChangesTrigger, databaseWebhookTrigger]
});
