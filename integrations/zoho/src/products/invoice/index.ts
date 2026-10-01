import { createInvoice } from './tools/create-invoice';
import { estimateActions } from './tools/estimate-actions';
import { getInvoice } from './tools/get-invoice';
import { invoiceActions } from './tools/invoice-actions';
import { listContacts } from './tools/list-contacts';
import { listCreditNotes } from './tools/list-credit-notes';
import { listEstimates } from './tools/list-estimates';
import { listExpenses } from './tools/list-expenses';
import { listInvoices } from './tools/list-invoices';
import { listItems } from './tools/list-items';
import { listPayments } from './tools/list-payments';
import { listProjects } from './tools/list-projects';
import { manageContact } from './tools/manage-contact';
import { manageCreditNote } from './tools/manage-credit-note';
import { manageEstimate } from './tools/manage-estimate';
import { manageExpense } from './tools/manage-expense';
import { manageItem } from './tools/manage-item';
import { managePayment } from './tools/manage-payment';
import { manageProject } from './tools/manage-project';
import { manageRecurringInvoice } from './tools/manage-recurring-invoice';
import { manageTimeEntry } from './tools/manage-time-entry';
import { updateInvoice } from './tools/update-invoice';

export const invoiceTools = [
  manageCreditNote,
  createInvoice,
  updateInvoice,
  listCreditNotes,
  invoiceActions,
  managePayment,
  manageContact,
  listEstimates,
  manageProject,
  listItems,
  manageItem,
  listExpenses,
  listPayments,
  listContacts,
  listProjects,
  manageRecurringInvoice,
  listInvoices,
  manageTimeEntry,
  getInvoice,
  estimateActions,
  manageExpense,
  manageEstimate
];
