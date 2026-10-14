import { Slate } from 'slates';
import { spec } from './spec';
import {
  createActivity,
  createContact,
  createEstimate,
  createFile,
  createInvoice,
  createJob,
  createTask,
  deleteContact,
  getAccountSettings,
  getContact,
  getJob,
  getTask,
  listActivities,
  listContacts,
  listFinancialDocuments,
  listJobs,
  listTasks,
  listUsers,
  updateContact,
  updateJob,
  updateTask
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    listJobs,
    getJob,
    createJob,
    updateJob,
    listTasks,
    createTask,
    updateTask,
    getTask,
    getAccountSettings,
    listUsers,
    createActivity,
    listActivities,
    createEstimate,
    createInvoice,
    listFinancialDocuments,
    createFile
  ],
  triggers: []
});
