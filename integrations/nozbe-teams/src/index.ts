import { Slate } from 'slates';
import { spec } from './spec';
import {
  assignTag,
  createComment,
  createProject,
  createTask,
  deleteComment,
  deleteProject,
  deleteTask,
  getProject,
  getTask,
  listComments,
  listProjects,
  listTagAssignments,
  listTags,
  listTasks,
  listTeamMembers,
  listTeams,
  manageProjectSection,
  manageTag,
  updateComment,
  updateProject,
  updateTask
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTeams,
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    listTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    listComments,
    createComment,
    updateComment,
    deleteComment,
    listTagAssignments,
    listTags,
    manageTag,
    assignTag,
    listTeamMembers,
    manageProjectSection
  ],
  triggers: []
});
