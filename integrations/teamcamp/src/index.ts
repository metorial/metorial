import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProject,
  createTask,
  deleteProject,
  getProject,
  getProjectDetails,
  getTask,
  getWorkspaceIdentity,
  listCustomers,
  listProjectGroups,
  listProjects,
  listTasks,
  listUsers,
  postComment,
  updateProject,
  updateTask
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getWorkspaceIdentity,
    listProjectGroups,
    getProjectDetails,
    listUsers,
    listCustomers,
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    listTasks,
    getTask,
    createTask,
    updateTask,
    postComment
  ],
  triggers: []
});
