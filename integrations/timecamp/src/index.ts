import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInvoice,
  createTask,
  createTimeEntry,
  deleteTask,
  deleteTimeEntry,
  getAttendance,
  listClients,
  listInvoices,
  listTags,
  listTasks,
  listTimeEntries,
  listUsers,
  manageClient,
  manageTag,
  manageTimer,
  updateTask,
  updateTimeEntry
} from './tools';
import { inboundWebhook, newTask, newTimeEntry } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    manageTimer,
    listUsers,
    listClients,
    manageClient,
    getAttendance,
    listTags,
    manageTag,
    listInvoices,
    createInvoice
  ],
  triggers: [inboundWebhook, newTimeEntry, newTask]
});
