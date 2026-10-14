import { Slate } from 'slates';
import { spec } from './spec';
import {
  getActivity,
  getCurrentUser,
  getProject,
  getTask,
  listMilestones,
  listPeople,
  listProjects,
  listTasks,
  listTimeEntries,
  manageComment,
  manageMessage,
  manageMilestone,
  manageNotebook,
  manageProject,
  manageProjectPeople,
  manageTask,
  manageTaskList,
  manageTimeEntry
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageProject,
    listProjects,
    getProject,
    manageTask,
    listTasks,
    getTask,
    manageTaskList,
    manageTimeEntry,
    listTimeEntries,
    manageMilestone,
    listMilestones,
    listPeople,
    getCurrentUser,
    manageMessage,
    manageComment,
    manageNotebook,
    manageProjectPeople,
    getActivity
  ],
  triggers: []
});
