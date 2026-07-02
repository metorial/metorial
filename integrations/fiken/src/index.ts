import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createInvoiceDraft,
  createProduct,
  createProject,
  getAccount,
  getAccountBalance,
  getCompany,
  getContact,
  getInvoice,
  getInvoiceDraft,
  getProduct,
  getProject,
  getPurchase,
  getSale,
  listAccountBalances,
  listAccounts,
  listCompanies,
  listContacts,
  listInvoiceDrafts,
  listInvoices,
  listProducts,
  listProjects,
  listPurchases,
  listSales
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listCompanies,
    getCompany,
    listContacts,
    getContact,
    createContact,
    listInvoices,
    getInvoice,
    listInvoiceDrafts,
    getInvoiceDraft,
    createInvoiceDraft,
    listProducts,
    getProduct,
    createProduct,
    listProjects,
    getProject,
    createProject,
    listPurchases,
    getPurchase,
    listSales,
    getSale,
    listAccounts,
    getAccount,
    listAccountBalances,
    getAccountBalance
  ],
  triggers: []
});
