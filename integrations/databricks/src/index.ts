import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseCatalog,
  browseWorkspace,
  executeSql,
  getJobRun,
  listClusters,
  listExperiments,
  listJobs,
  listPipelines,
  listServingEndpoints,
  listWarehouses,
  manageCluster,
  manageDbfs,
  manageFiles,
  manageJob,
  manageNotebook,
  managePipeline,
  manageSecrets,
  manageVectorSearch,
  manageWarehouse,
  queryServingEndpoint,
  runJob,
  searchRuns
} from './tools';
import { jobRunsTrigger, modelRegistryTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listClusters,
    manageCluster,
    listJobs,
    manageJob,
    runJob,
    getJobRun,
    executeSql,
    listWarehouses,
    manageWarehouse,
    browseWorkspace,
    manageNotebook,
    browseCatalog,
    manageSecrets,
    listExperiments,
    searchRuns,
    listServingEndpoints,
    queryServingEndpoint,
    managePipeline,
    listPipelines,
    manageDbfs,
    manageFiles,
    manageVectorSearch
  ],
  triggers: [modelRegistryTrigger, jobRunsTrigger]
});
