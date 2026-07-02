import { Slate } from 'slates';
import { spec } from './spec';
import {
  createComment,
  createDoc,
  createTask,
  deleteDoc,
  deleteTask,
  getTask,
  getWorkspaceConfig,
  listComments,
  listDocs,
  listTasks,
  updateDoc,
  updateTask
} from './tools';
import { docEvents, inboundWebhook, taskEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTask,
    updateTask,
    getTask,
    listTasks,
    deleteTask,
    createComment,
    listComments,
    createDoc,
    updateDoc,
    listDocs,
    deleteDoc,
    getWorkspaceConfig
  ],
  triggers: [inboundWebhook, taskEvents, docEvents]
});
