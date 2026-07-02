import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSync,
  deleteSync,
  getDatasetRecord,
  getSync,
  getSyncRuns,
  listConnections,
  listSyncs,
  listWebhooks,
  manageWebhook,
  triggerSync,
  updateSync
} from './tools';
import { syncAlert } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [syncAlert]
});
