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
  getTask,
  listComments,
  listProjects,
  listTags,
  listTasks,
  listTeamMembers,
  manageProjectSection,
  manageTag,
  updateComment,
  updateProject,
  updateTask
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
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
    listTags,
    manageTag,
    assignTag,
    listTeamMembers,
    manageProjectSection
  ],
  triggers: []
});
