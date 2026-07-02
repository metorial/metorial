import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createCreditNote,
  createEstimate,
  createExpense,
  createInvoice,
  createProduct,
  createProject,
  createTimeEntry,
  deleteContact,
  getContact,
  getInvoice,
  listBills,
  listContacts,
  listDocumentTypes,
  listEstimates,
  listExpenses,
  listInvoices,
  listPaymentsReceived,
  listProducts,
  listProjects,
  listTaxes,
  listTimeEntries,
  recordPaymentReceived,
  sendInvoiceEmail,
  updateContact,
  updateInvoice,
  voidInvoice
} from './tools';
import {
  contactChanges,
  inboundWebhook,
  invoiceChanges,
  paymentReceivedChanges
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    listInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    sendInvoiceEmail,
    voidInvoice,
    createCreditNote,
    listEstimates,
    createEstimate,
    listExpenses,
    createExpense,
    recordPaymentReceived,
    listPaymentsReceived,
    listProducts,
    createProduct,
    listProjects,
    createProject,
    createTimeEntry,
    listTimeEntries,
    listBills,
    listDocumentTypes,
    listTaxes
  ],
  triggers: [inboundWebhook, invoiceChanges, contactChanges, paymentReceivedChanges]
});
