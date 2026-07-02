import { Slate } from 'slates';
import { spec } from './spec';
import {
  closeBatchChange,
  createCodeInsight,
  createCodeMonitor,
  deleteCodeInsight,
  deleteCodeMonitor,
  getBatchChange,
  getCurrentUser,
  getFileContent,
  getRepository,
  listBatchChanges,
  listCodeInsights,
  listCodeMonitors,
  listRepositories,
  searchCode
} from './tools';
import { batchChangeEvents, codeMonitorNotification } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchCode,
    getFileContent,
    listRepositories,
    getRepository,
    listBatchChanges,
    getBatchChange,
    closeBatchChange,
    listCodeInsights,
    createCodeInsight,
    deleteCodeInsight,
    listCodeMonitors,
    createCodeMonitor,
    deleteCodeMonitor,
    getCurrentUser
  ],
  triggers: [batchChangeEvents, codeMonitorNotification]
});
