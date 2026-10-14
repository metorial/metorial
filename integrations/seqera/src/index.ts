import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelWorkflow,
  createPipeline,
  getCurrentUser,
  getPipeline,
  getWorkflow,
  launchWorkflow,
  listComputeEnvs,
  listCredentials,
  listDatasets,
  listOrganizations,
  listParticipants,
  listPipelines,
  listWorkflows,
  listWorkflowTasks,
  listWorkspaces,
  manageActions,
  manageComputeEnv,
  manageDataset,
  manageLabels,
  managePipeline,
  manageSecrets
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listPipelines,
    getPipeline,
    createPipeline,
    managePipeline,
    launchWorkflow,
    listWorkflows,
    getWorkflow,
    listWorkflowTasks,
    cancelWorkflow,
    listComputeEnvs,
    manageComputeEnv,
    listDatasets,
    manageDataset,
    listCredentials,
    manageSecrets,
    listOrganizations,
    listWorkspaces,
    manageActions,
    manageLabels,
    listParticipants
  ],
  triggers: []
});
