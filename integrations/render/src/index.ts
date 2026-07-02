import { Slate } from 'slates';
import { spec } from './spec';
import {
  getMetrics,
  getService,
  listDeploys,
  listPostgres,
  listServiceInstances,
  listServices,
  listWorkspaces,
  manageBlueprints,
  manageCustomDomains,
  manageDeploys,
  manageDisks,
  manageEnvGroups,
  manageEnvVars,
  manageEvents,
  manageJobs,
  manageKeyValue,
  manageMaintenance,
  managePostgres,
  manageProjects,
  manageRegistryCredentials,
  manageSecretFiles,
  manageService,
  manageWebhooks,
  queryLogs,
  scaleService,
  updateService
} from './tools';
import { databaseEvents, deploymentEvents, diskEvents, serviceEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listServices,
    getService,
    updateService,
    manageService,
    listDeploys,
    manageDeploys,
    manageEnvVars,
    manageSecretFiles,
    scaleService,
    manageCustomDomains,
    managePostgres,
    listPostgres,
    manageKeyValue,
    manageEnvGroups,
    manageJobs,
    manageDisks,
    listServiceInstances,
    manageEvents,
    queryLogs,
    getMetrics,
    manageProjects,
    manageBlueprints,
    manageRegistryCredentials,
    manageWebhooks,
    manageMaintenance,
    listWorkspaces
  ],
  triggers: [deploymentEvents, serviceEvents, databaseEvents, diskEvents]
});
