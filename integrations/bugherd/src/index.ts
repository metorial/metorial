import { Slate } from 'slates';
import { spec } from './spec';
import {
  addAttachment,
  createColumn,
  createComment,
  createProject,
  createTask,
  deleteAttachment,
  deleteProject,
  getOrganization,
  getProject,
  getTask,
  listAttachments,
  listColumns,
  listComments,
  listProjects,
  listTasks,
  listUsers,
  moveTasks,
  updateColumn,
  updateProject,
  updateTask
} from './tools';
import {
  commentCreated,
  projectCreated,
  taskCreated,
  taskDestroyed,
  taskUpdated
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getOrganization,
    listUsers,
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    listTasks,
    getTask,
    createTask,
    updateTask,
    moveTasks,
    listComments,
    createComment,
    listAttachments,
    addAttachment,
    deleteAttachment,
    listColumns,
    createColumn,
    updateColumn
  ],
  triggers: [projectCreated, taskCreated, taskUpdated, taskDestroyed, commentCreated]
});
