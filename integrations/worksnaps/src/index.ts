import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOfflineTimeEntry,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getProject,
  getProjectReport,
  getSummaryReport,
  getTask,
  getTimeEntries,
  getTimeEntry,
  getUser,
  listProjects,
  listTasks,
  listUsers,
  manageTaskAssignments,
  manageTimeEntries,
  manageUserAssignments,
  updateProject,
  updateTask,
  updateUser
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    createOfflineTimeEntry,
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
    manageTimeEntries,
    listUsers,
    getUser,
    updateUser,
    getProjectReport,
    getSummaryReport,
    getTask
  ],
  triggers: []
});
