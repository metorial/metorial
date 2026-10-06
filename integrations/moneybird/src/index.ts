import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createEstimate,
  createSalesInvoice,
  downloadSalesInvoice,
  getContact,
  getFileUrl,
  getSalesInvoice,
  linkBooking,
  listAdministrations,
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
export let provider = Slate.create({
  spec,
  tools: [
    listAdministrations,
    downloadSalesInvoice,
    getFileUrl,
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
  ],
  triggers: []
});
