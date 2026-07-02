import { Slate } from 'slates';
import { spec } from './spec';
import {
  getClient,
  getInvoice,
  listClients,
  listExpenses,
  listInvoices,
  listItems,
  listPayments,
  listProjects,
  listTaxes,
  listTimeEntries,
  manageClients,
  manageCreditNotes,
  manageEstimates,
  manageExpenses,
  manageInvoices,
  manageItems,
  managePayments,
  manageProjects,
  manageTaxes,
  manageTimeEntries
} from './tools';
import {
  billEvents,
  clientEvents,
  creditNoteEvents,
  estimateEvents,
  expenseEvents,
  invoiceEvents,
  itemEvents,
  paymentEvents,
  projectEvents,
  taxEvents,
  timeEntryEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageClients,
    listClients,
    getClient,
    manageInvoices,
    listInvoices,
    getInvoice,
    managePayments,
    listPayments,
    manageEstimates,
    manageExpenses,
    listExpenses,
    manageTimeEntries,
    listTimeEntries,
    manageProjects,
    listProjects,
    manageTaxes,
    listTaxes,
    manageItems,
    listItems,
    manageCreditNotes
  ],
  triggers: [
    invoiceEvents,
    clientEvents,
    estimateEvents,
    expenseEvents,
    paymentEvents,
    projectEvents,
    timeEntryEvents,
    billEvents,
    creditNoteEvents,
    itemEvents,
    taxEvents
  ]
});
