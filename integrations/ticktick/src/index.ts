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
  listCompletedTasks,
  listProjects,
  moveTasks,
  searchTasks,
  updateProject,
  updateTask
} from './tools';
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
    getUser,
    listCompletedTasks,
    moveTasks,
    searchTasks
  ],
  triggers: []
});
