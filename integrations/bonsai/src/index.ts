import { Slate } from 'slates';
import { spec } from './spec';
import {
  createClient,
  createDeal,
  createProject,
  createTask,
  createTasksFromTemplate,
  listClients,
  listDeals,
  listProjects,
  listTasks,
  listTaskTemplates
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createClient,
    createProject,
    createDeal,
    createTask,
    createTasksFromTemplate,
    listClients,
    listProjects,
    listTasks,
    listDeals,
    listTaskTemplates
  ],
  triggers: []
});
