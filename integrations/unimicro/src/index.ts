import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadFile,
  getBalanceSheet,
  getCustomer,
  getCustomerInvoice,
  getProfitAndLoss,
  getSupplierInvoice,
  getTrialBalance,
  listAccounts,
  listCompanies,
  listCustomerInvoices,
  listCustomers,
  listJournalEntries,
  listProducts,
  listProjects,
  listSupplierInvoices,
  listSuppliers
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listCompanies,
    listCustomers,
    getCustomer,
    listSuppliers,
    listCustomerInvoices,
    getCustomerInvoice,
    listSupplierInvoices,
    getSupplierInvoice,
    listProducts,
    listAccounts,
    listJournalEntries,
    listProjects,
    getProfitAndLoss,
    getBalanceSheet,
    getTrialBalance,
    downloadFile
  ],
  triggers: []
});
