import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelWorkflow,
  createPipeline,
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
  listWorkspaces,
  manageActions,
  manageComputeEnv,
  manageDataset,
  manageLabels,
  manageSecrets
} from './tools';
import { inboundWebhook, workflowUpdate } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listPipelines,
    getPipeline,
    createPipeline,
    launchWorkflow,
    listWorkflows,
    getWorkflow,
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
  triggers: [inboundWebhook, workflowUpdate]
});
