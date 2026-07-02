import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getProject,
  getProjectReport,
  getSummaryReport,
  getTimeEntries,
  getTimeEntry,
  getUser,
  listProjects,
  listTasks,
  listUsers,
  manageTaskAssignments,
  manageUserAssignments,
  updateProject,
  updateTask,
  updateUser
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    getTimeEntries,
    getTimeEntry,
    manageUserAssignments,
    manageTaskAssignments,
    listUsers,
    getUser,
    updateUser,
    getProjectReport,
    getSummaryReport
  ],
  triggers: [inboundWebhook]
});
