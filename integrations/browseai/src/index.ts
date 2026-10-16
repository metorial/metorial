import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBulkRun,
  createMonitor,
  createWebhook,
  deleteMonitor,
  deleteWebhook,
  downloadTaskData,
  getBulkRun,
  getFileUrl,
  getMonitor,
  getRobot,
  getSystemStatus,
  getTask,
  listBulkRuns,
  listMonitors,
  listRobots,
  listTasks,
  listWebhooks,
  runTask,
  updateCookies,
  updateMonitor
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listRobots,
    createMonitor,
    deleteMonitor,
    downloadTaskData,
    getFileUrl,
    getMonitor,
    getSystemStatus,
    listBulkRuns,
    listMonitors,
    updateMonitor,
    getRobot,
    runTask,
    getTask,
    listTasks,
    createBulkRun,
    getBulkRun,
    updateCookies,
    listWebhooks,
    createWebhook,
    deleteWebhook
  ],
  triggers: []
});
