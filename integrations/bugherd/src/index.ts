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
  getTaskByLocalId,
  listAttachments,
  listColumns,
  listComments,
  listProjects,
  listTasks,
  listUsers,
  listUserTasks,
  moveTasks,
  updateColumn,
  updateProject,
  updateTask
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getOrganization,
    listUsers,
    listUserTasks,
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    listTasks,
    getTask,
    getTaskByLocalId,
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
  triggers: []
});
