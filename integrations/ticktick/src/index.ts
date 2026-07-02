import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchTasks,
  completeTask,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getProject,
  getTask,
  getUser,
  listProjects,
  updateProject,
  updateTask
} from './tools';
import { inboundWebhook, taskChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    getTask,
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    batchTasks,
    getUser
  ],
  triggers: [inboundWebhook, taskChanges]
});
