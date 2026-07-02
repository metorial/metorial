import { Slate } from 'slates';
import { spec } from './spec';
import {
  assignWorkspaceCapacity,
  executeDaxQuery,
  exportReport,
  generateEmbedToken,
  getDataset,
  listApps,
  listCapacities,
  listDashboards,
  listDataflows,
  listDatasets,
  listGateways,
  listReports,
  listWorkspaces,
  managePipeline,
  manageReport,
  manageWorkspace,
  manageWorkspaceUsers,
  pushData,
  refreshDataflow,
  refreshDataset,
  updateDatasetParameters
} from './tools';
import { datasetRefreshCompleted, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listWorkspaces,
    manageWorkspace,
    manageWorkspaceUsers,
    listDatasets,
    getDataset,
    refreshDataset,
    updateDatasetParameters,
    pushData,
    listReports,
    manageReport,
    exportReport,
    listDashboards,
    executeDaxQuery,
    generateEmbedToken,
    managePipeline,
    listDataflows,
    refreshDataflow,
    listGateways,
    listApps,
    listCapacities,
    assignWorkspaceCapacity
  ],
  triggers: [inboundWebhook, datasetRefreshCompleted]
});
