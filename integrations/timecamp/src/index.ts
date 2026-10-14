import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInvoice,
  createTask,
  createTimeEntry,
  deleteTask,
  deleteTimeEntry,
  getAttendance,
  getCurrentUser,
  listClients,
  listGroups,
  listInvoices,
  listTagLists,
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
    getCurrentUser,
    listGroups,
    listTagLists,
    listClients,
    manageClient,
    getAttendance,
    listTags,
    manageTag,
    listInvoices,
    createInvoice
  ],
  triggers: []
});
