import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelSyncRun,
  createSync,
  deleteSync,
  getDatasetRecord,
  getSync,
  getSyncRuns,
  getWorkspace,
  listConnections,
  listDatasets,
  listDestinationObjects,
  listSourceObjects,
  listSyncs,
  listWebhooks,
  listWorkspaces,
  manageWebhook,
  triggerSync,
  updateSync
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getWorkspace,
    listWorkspaces,
    listSourceObjects,
    listDestinationObjects,
    listDatasets,
    cancelSyncRun,
    listSyncs,
    getSync,
    createSync,
    updateSync,
    triggerSync,
    deleteSync,
    getSyncRuns,
    listConnections,
    manageWebhook,
    listWebhooks,
    getDatasetRecord
  ],
  triggers: []
});
