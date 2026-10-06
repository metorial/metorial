import { Slate } from 'slates';
import { spec } from './spec';
import {
  actionInboxTask,
  createCustomObject,
  deleteCustomObject,
  executeWql,
  getCurrentUser,
  getCustomObject,
  getCustomReport,
  getInboxTasks,
  getOrganizationWorkers,
  getResource,
  getTimeBlocks,
  getTimeOffEntries,
  getWorker,
  listCustomObjects,
  listOrganizations,
  listResources,
  listWorkers,
  requestTimeOff,
  updateCustomObject
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getResource,
    listResources,
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
  triggers: []
});
