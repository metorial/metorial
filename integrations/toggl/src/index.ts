import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTimeEntry,
  deleteTimeEntry,
  getMe,
  getReport,
  getTimeEntry,
  getWorkspace,
  listClients,
  listProjects,
  listTags,
  listTasks,
  listTimeEntries,
  listWorkspaceUsers,
  manageClient,
  manageProject,
  manageTag,
  manageTask,
  stopTimeEntry,
  updateTimeEntry
} from './tools';
import {
  clientEventsTrigger,
  projectEventsTrigger,
  tagEventsTrigger,
  taskEventsTrigger,
  timeEntryEventsTrigger,
  workspaceUserEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTimeEntry,
    getTimeEntry,
    updateTimeEntry,
    stopTimeEntry,
    deleteTimeEntry,
    listTimeEntries,
    manageProject,
    listProjects,
    manageClient,
    listClients,
    manageTag,
    listTags,
    manageTask,
    listTasks,
    getWorkspace,
    listWorkspaceUsers,
    getMe,
    getReport
  ],
  triggers: [
    timeEntryEventsTrigger,
    projectEventsTrigger,
    clientEventsTrigger,
    tagEventsTrigger,
    taskEventsTrigger,
    workspaceUserEventsTrigger
  ]
});
