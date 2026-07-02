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
  getContact,
  getJob,
  listActivities,
  listContacts,
  listFinancialDocuments,
  listJobs,
  listTasks,
  updateContact,
  updateJob,
  updateTask
} from './tools';
import { contactEvents, inboundWebhook, jobEvents, taskEvents } from './triggers';

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
    createActivity,
    listActivities,
    createEstimate,
    createInvoice,
    listFinancialDocuments,
    createFile
  ],
  triggers: [inboundWebhook, contactEvents, jobEvents, taskEvents]
});
