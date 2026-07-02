import { Slate } from 'slates';
import { spec } from './spec';
import {
  createComment,
  createProject,
  createTask,
  deleteComment,
  deleteProject,
  deleteTask,
  findComment,
  findProject,
  findTask,
  updateProject,
  updateTask
} from './tools';
import { commentEvents, projectEvents, taskEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createProject,
    findProject,
    updateProject,
    deleteProject,
    createTask,
    findTask,
    updateTask,
    deleteTask,
    createComment,
    findComment,
    deleteComment
  ],
  triggers: [projectEvents, taskEvents, commentEvents]
});
