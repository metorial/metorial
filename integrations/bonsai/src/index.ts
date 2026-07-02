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
import {
  contractEvents,
  dealUpdated,
  eventScheduled,
  formSubmitted,
  invoiceEvents,
  proposalEvents,
  taskUpdated
} from './triggers';

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
  triggers: [
    proposalEvents,
    contractEvents,
    invoiceEvents,
    dealUpdated,
    taskUpdated,
    eventScheduled,
    formSubmitted
  ]
});
