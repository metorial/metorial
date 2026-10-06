import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelTask,
  createBatch,
  createEvaluationTask,
  createProject,
  createTask,
  finalizeBatch,
  getBatch,
  getProject,
  getTask,
  importFile,
  listBatches,
  listProjects,
  listTasks,
  manageTeam,
  resendCallback,
  updateProject,
  updateTask
} from './tools';

export let provider = Slate.create({
  spec,
  triggers: [],
  tools: [
    createProject,
    getProject,
    listProjects,
    updateProject,
    createTask,
    getTask,
    listTasks,
    cancelTask,
    updateTask,
    createBatch,
    getBatch,
    listBatches,
    finalizeBatch,
    manageTeam,
    importFile,
    createEvaluationTask,
    resendCallback
  ]
});
