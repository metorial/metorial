import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNote,
  createAccount,
  createActivity,
  createContact,
  createLead,
  createTask,
  findAccounts,
  findActivities,
  findContacts,
  findLeads,
  getAccount,
  getContact,
  getLead,
  getTimeline,
  listActivityTypes,
  listPipelinesStages,
  listProducts,
  listSources,
  listUsersTeams,
  searchCrm,
  updateAccount,
  updateContact,
  updateLead
} from './tools';
import { entityChanges, newAccounts, newContacts, newLeads } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    getContact,
    updateContact,
    findContacts,
    createAccount,
    getAccount,
    updateAccount,
    findAccounts,
    createLead,
    getLead,
    updateLead,
    findLeads,
    createActivity,
    findActivities,
    createTask,
    addNote,
    searchCrm,
    listProducts,
    listPipelinesStages,
    listUsersTeams,
    listActivityTypes,
    listSources,
    getTimeline
  ],
  triggers: [entityChanges, newLeads, newContacts, newAccounts]
});
