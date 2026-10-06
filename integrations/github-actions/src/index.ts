import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlWorkflowRun,
  getCurrentUser,
  getWorkflowRun,
  getWorkflowRunLogs,
  listArtifacts,
  listPendingDeployments,
  listWorkflowRuns,
  listWorkflows,
  manageArtifact,
  manageCaches,
  managePermissions,
  manageRunners,
  manageSecrets,
  manageVariables,
  manageWorkflowState,
  triggerWorkflow
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listPendingDeployments,
    listWorkflows,
    triggerWorkflow,
    manageWorkflowState,
    listWorkflowRuns,
    getWorkflowRun,
    controlWorkflowRun,
    getWorkflowRunLogs,
    listArtifacts,
    manageArtifact,
    manageSecrets,
    manageVariables,
    manageCaches,
    manageRunners,
    managePermissions
  ],
  triggers: []
});
