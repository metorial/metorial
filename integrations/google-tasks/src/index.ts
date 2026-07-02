import { Slate } from 'slates';
import { spec } from './spec';
import {
  clearCompletedTasks,
  createTask,
  createTaskList,
  deleteTask,
  deleteTaskList,
  getTask,
  listTaskLists,
  listTasks,
  moveTask,
  updateTask,
  updateTaskList
} from './tools';
import { inboundWebhook, taskChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTaskLists,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    listTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    clearCompletedTasks
  ],
  triggers: [inboundWebhook, taskChanges]
});
