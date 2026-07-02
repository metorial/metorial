import { Slate } from 'slates';
import { spec } from './spec';
import {
  getMetrics,
  getService,
  listDeploys,
  listPostgres,
  listServices,
  listWorkspaces,
  manageCustomDomains,
  manageDeploys,
  manageDisks,
  manageEnvGroups,
  manageEnvVars,
  manageJobs,
  manageKeyValue,
  managePostgres,
  manageProjects,
  manageService,
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
    scaleService,
    manageCustomDomains,
    managePostgres,
    listPostgres,
    manageKeyValue,
    manageEnvGroups,
    manageJobs,
    manageDisks,
    queryLogs,
    getMetrics,
    manageProjects,
    listWorkspaces
  ],
  triggers: [deploymentEvents, serviceEvents, databaseEvents, diskEvents]
});
