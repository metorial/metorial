import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlWorkflowRun,
  getWorkflowRun,
  getWorkflowRunLogs,
  listArtifacts,
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
import {
  checkRunTrigger,
  deploymentStatusTrigger,
  workflowJobTrigger,
  workflowRunTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [workflowRunTrigger, workflowJobTrigger, checkRunTrigger, deploymentStatusTrigger]
});
