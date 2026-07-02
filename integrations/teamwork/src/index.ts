import { Slate } from 'slates';
import { spec } from './spec';
import {
  getActivity,
  getProject,
  getTask,
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
import {
  commentEvents,
  messageEvents,
  milestoneEvents,
  projectEvents,
  taskEvents,
  timeEntryEvents
} from './triggers';

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
    listPeople,
    manageMessage,
    manageComment,
    manageNotebook,
    manageProjectPeople,
    getActivity
  ],
  triggers: [
    taskEvents,
    projectEvents,
    milestoneEvents,
    timeEntryEvents,
    commentEvents,
    messageEvents
  ]
});
