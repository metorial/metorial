import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEntry,
  createOpportunity,
  createParty,
  createProject,
  createTask,
  deleteOpportunity,
  deleteParty,
  deleteProject,
  deleteTask,
  getParty,
  listEntries,
  listOpportunities,
  listParties,
  listPipelines,
  listProjects,
  listTasks,
  listUsers,
  manageTags,
  searchParties,
  updateOpportunity,
  updateParty,
  updateProject,
  updateTask
} from './tools';
import {
  opportunityEvents,
  partyEvents,
  projectEvents,
  taskEvents,
  userEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listParties,
    getParty,
    createParty,
    updateParty,
    deleteParty,
    searchParties,
    listOpportunities,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    listProjects,
    createProject,
    updateProject,
    deleteProject,
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    listEntries,
    createEntry,
    manageTags,
    listPipelines,
    listUsers
  ],
  triggers: [partyEvents, opportunityEvents, projectEvents, taskEvents, userEvents]
});
