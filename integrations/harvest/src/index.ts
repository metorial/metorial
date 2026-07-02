import { Slate } from 'slates';
import { spec } from './spec';
import {
  generateReport,
  getCompany,
  listClients,
  listExpenses,
  listInvoices,
  listProjects,
  listTasks,
  listTimeEntries,
  listUsers,
  manageClient,
  manageContact,
  manageEstimate,
  manageExpense,
  manageInvoice,
  manageProject,
  manageTask,
  manageTimeEntry,
  manageUser,
  recordInvoicePayment,
  sendInvoice,
  startStopTimer
} from './tools';
import { inboundWebhook, invoiceChanges, projectChanges, timeEntryChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageTimeEntry,
    listTimeEntries,
    startStopTimer,
    manageProject,
    listProjects,
    manageClient,
    listClients,
    manageInvoice,
    listInvoices,
    sendInvoice,
    recordInvoicePayment,
    manageExpense,
    listExpenses,
    manageTask,
    listTasks,
    manageUser,
    listUsers,
    manageEstimate,
    manageContact,
    generateReport,
    getCompany
  ],
  triggers: [inboundWebhook, timeEntryChanges, invoiceChanges, projectChanges]
});
