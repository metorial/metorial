import { Slate } from 'slates';
import { spec } from './spec';
import {
  applyResource,
  clusterInfo,
  deleteResource,
  getPodLogs,
  getResource,
  listResources,
  manageAutoscaler,
  manageConfigStorage,
  manageDeployment,
  manageJob,
  manageNamespace,
  manageRbac,
  manageService
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listResources,
    getResource,
    manageDeployment,
    getPodLogs,
    manageService,
    manageConfigStorage,
    manageNamespace,
    deleteResource,
    applyResource,
    clusterInfo,
    manageRbac,
    manageAutoscaler,
    manageJob
  ],
  triggers: []
});
