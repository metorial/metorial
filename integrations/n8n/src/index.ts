import { Slate } from 'slates';
import { spec } from './spec';
import {
  activateWorkflow,
  createCredential,
  createWorkflow,
  deleteCredential,
  deleteExecution,
  deleteWorkflow,
  generateAudit,
  getCredentialSchema,
  getExecution,
  getWorkflow,
  listCredentials,
  listExecutions,
  listUsers,
  listWorkflows,
  manageProjects,
  manageTags,
  manageVariables,
  manageWorkflowTags,
  retryExecution,
  sourceControlPull,
  stopExecution,
  transferResource,
  updateWorkflow
} from './tools';
import { executionCompleted, inboundWebhook, workflowChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    activateWorkflow,
    manageWorkflowTags,
    listExecutions,
    getExecution,
    retryExecution,
    stopExecution,
    deleteExecution,
    listCredentials,
    createCredential,
    deleteCredential,
    getCredentialSchema,
    listUsers,
    manageTags,
    manageVariables,
    manageProjects,
    transferResource,
    sourceControlPull,
    generateAudit
  ],
  triggers: [inboundWebhook, workflowChanges, executionCompleted]
});
