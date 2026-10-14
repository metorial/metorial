import { Slate } from 'slates';
import { spec } from './spec';
import {
  createClient,
  createDeal,
  createProject,
  createTask,
  createTasksFromTemplate,
  getTask,
  listClients,
  listDeals,
  listProjects,
  listTaskStatuses,
  listTasks,
  listTaskTemplates,
  listTeamMembers
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
    listTaskTemplates,
    getTask,
    listTaskStatuses,
    listTeamMembers
  ],
  triggers: []
});
