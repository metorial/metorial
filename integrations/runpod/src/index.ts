import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEndpoint,
  createNetworkVolume,
  createPod,
  createTemplate,
  deleteEndpoint,
  getBilling,
  getEndpoint,
  getJobStatus,
  getPod,
  listEndpoints,
  listNetworkVolumes,
  listPods,
  listTemplates,
  manageJob,
  manageNetworkVolume,
  managePod,
  manageTemplate,
  runJob,
  updateEndpoint,
  updatePod
} from './tools';
import { serverlessJobCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listPods,
    getPod,
    createPod,
    updatePod,
    managePod,
    listEndpoints,
    getEndpoint,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    runJob,
    getJobStatus,
    manageJob,
    listNetworkVolumes,
    createNetworkVolume,
    manageNetworkVolume,
    listTemplates,
    createTemplate,
    manageTemplate,
    getBilling
  ],
  triggers: [serverlessJobCompleted]
});
