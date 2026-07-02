import { Slate } from 'slates';
import { spec } from './spec';
import {
  createComment,
  createCustomField,
  createProject,
  createRecurringTask,
  createTask,
  deleteCustomField,
  deleteRecurringTask,
  deleteTask,
  getProject,
  getTask,
  listComments,
  listCustomFields,
  listProjects,
  listRecurringTasks,
  listSchedules,
  listStatuses,
  listTasks,
  listUsers,
  listWorkspaces,
  setCustomFieldValue,
  updateTask
} from './tools';
import { inboundWebhook, taskUpdates } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTask,
    getTask,
    listTasks,
    updateTask,
    deleteTask,
    createProject,
    getProject,
    listProjects,
    createRecurringTask,
    listRecurringTasks,
    deleteRecurringTask,
    listComments,
    createComment,
    listCustomFields,
    createCustomField,
    deleteCustomField,
    setCustomFieldValue,
    listWorkspaces,
    listStatuses,
    listSchedules,
    listUsers
  ],
  triggers: [inboundWebhook, taskUpdates]
});
