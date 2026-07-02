import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createEstimate,
  createSalesInvoice,
  getContact,
  getSalesInvoice,
  linkBooking,
  listContacts,
  listEstimates,
  listFinancialMutations,
  listSalesInvoices,
  listTaxRates,
  manageEstimate,
  manageLedgerAccounts,
  manageProducts,
  manageProjects,
  manageRecurringInvoices,
  manageSalesInvoice,
  manageTimeEntries,
  updateContact
} from './tools';
import {
  contactEvents,
  documentEvents,
  estimateEvents,
  paymentEvents,
  recurringInvoiceEvents,
  salesInvoiceEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    getContact,
    createContact,
    updateContact,
    listSalesInvoices,
    getSalesInvoice,
    createSalesInvoice,
    manageSalesInvoice,
    manageRecurringInvoices,
    listEstimates,
    createEstimate,
    manageEstimate,
    manageProducts,
    manageLedgerAccounts,
    listTaxRates,
    manageTimeEntries,
    manageProjects,
    listFinancialMutations,
    linkBooking
  ] as any,
  triggers: [
    contactEvents,
    salesInvoiceEvents,
    estimateEvents,
    paymentEvents,
    documentEvents,
    recurringInvoiceEvents
  ] as any
});
