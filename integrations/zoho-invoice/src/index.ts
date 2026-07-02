import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInvoice,
  estimateActions,
  getInvoice,
  invoiceActions,
  listContacts,
  listCreditNotes,
  listEstimates,
  listExpenses,
  listInvoices,
  listItems,
  listPayments,
  listProjects,
  manageContact,
  manageCreditNote,
  manageEstimate,
  manageExpense,
  manageItem,
  managePayment,
  manageProject,
  manageRecurringInvoice,
  manageTimeEntry,
  updateInvoice
} from './tools';
import {
  inboundWebhook,
  newContact,
  newEstimate,
  newExpense,
  newInvoice,
  newPayment,
  updatedInvoice
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createInvoice,
    getInvoice,
    updateInvoice,
    listInvoices,
    invoiceActions,
    estimateActions,
    manageContact,
    listContacts,
    manageEstimate,
    listEstimates,
    manageExpense,
    listExpenses,
    managePayment,
    listPayments,
    manageCreditNote,
    listCreditNotes,
    manageProject,
    listProjects,
    manageItem,
    listItems,
    manageTimeEntry,
    manageRecurringInvoice
  ],
  triggers: [
    inboundWebhook,
    newInvoice,
    updatedInvoice,
    newContact,
    newEstimate,
    newExpense,
    newPayment
  ]
});
