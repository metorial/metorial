import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createContactRecord,
  createOpportunity,
  createTask,
  findTask,
  getCurrentUser,
  getNotifications,
  listCompanies,
  listContacts,
  listUsers,
  logTime
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    createOpportunity,
    createTask,
    findTask,
    logTime,
    listUsers,
    getNotifications,
    createContactRecord,
    getCurrentUser,
    listContacts,
    listCompanies
  ],
  triggers: []
});
