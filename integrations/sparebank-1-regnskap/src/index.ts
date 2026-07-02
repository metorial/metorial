import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadFile,
  getBalanceSheet,
  getCustomer,
  getCustomerInvoice,
  getProfitAndLoss,
  getSupplier,
  getSupplierInvoice,
  getTrialBalance,
  listAccounts,
  listCompanies,
  listCustomerInvoices,
  listCustomers,
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
    getSupplier,
    listCustomerInvoices,
    getCustomerInvoice,
    listSupplierInvoices,
    getSupplierInvoice,
    listProducts,
    listAccounts,
    listProjects,
    getTrialBalance,
    getProfitAndLoss,
    getBalanceSheet,
    downloadFile
  ],
  triggers: []
});
