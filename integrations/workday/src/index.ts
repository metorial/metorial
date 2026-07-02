import { Slate } from 'slates';
import { spec } from './spec';
import {
  actionInboxTask,
  createCustomObject,
  deleteCustomObject,
  executeWql,
  getCustomObject,
  getCustomReport,
  getInboxTasks,
  getOrganizationWorkers,
  getTimeBlocks,
  getTimeOffEntries,
  getWorker,
  listCustomObjects,
  listOrganizations,
  listWorkers,
  requestTimeOff,
  updateCustomObject
} from './tools';
import { inboundWebhook, workerChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listWorkers,
    getWorker,
    getTimeOffEntries,
    requestTimeOff,
    getTimeBlocks,
    executeWql,
    getCustomReport,
    getInboxTasks,
    actionInboxTask,
    listOrganizations,
    getOrganizationWorkers,
    listCustomObjects,
    getCustomObject,
    createCustomObject,
    updateCustomObject,
    deleteCustomObject
  ],
  triggers: [inboundWebhook, workerChanges]
});
