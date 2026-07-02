import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConnection,
  deleteConnection,
  getConnection,
  getFlow,
  getFlowErrors,
  getJob,
  getTokenInfo,
  listConnections,
  listExports,
  listFlows,
  listImports,
  listIntegrations,
  listJobs,
  manageExport,
  manageFlow,
  manageImport,
  manageIntegration,
  manageState,
  manageUsers,
  resolveErrors,
  retryErrors,
  updateConnection
} from './tools';
import { flowErrorDetected, inboundWebhook, jobCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getTokenInfo,
    listConnections,
    getConnection,
    createConnection,
    updateConnection,
    deleteConnection,
    listFlows,
    getFlow,
    manageFlow,
    listExports,
    manageExport,
    listImports,
    manageImport,
    listIntegrations,
    manageIntegration,
    getFlowErrors,
    resolveErrors,
    retryErrors,
    listJobs,
    getJob,
    manageUsers,
    manageState
  ],
  triggers: [inboundWebhook, jobCompleted, flowErrorDetected]
});
