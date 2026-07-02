import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBulkRun,
  createWebhook,
  deleteWebhook,
  getBulkRun,
  getRobot,
  getTask,
  listRobots,
  listTasks,
  listWebhooks,
  runTask,
  updateCookies
} from './tools';
import { dataChanged, tableExportCompleted, taskCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRobots,
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
  triggers: [taskCompleted, dataChanged, tableExportCompleted]
});
