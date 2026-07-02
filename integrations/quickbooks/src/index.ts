import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createAccount,
  createBill,
  createCustomer,
  createEstimate,
  createInvoice,
  createItem,
  createJournalEntry,
  createPayment,
  createSalesReceipt,
  createVendor,
  deleteSalesReceipt,
  getAccount,
  getCompanyInfo,
  getCustomer,
  getInvoice,
  getPayment,
  getReport,
  getSalesReceipt,
  getVendor,
  payBill,
  queryEntities,
  recordExpense,
  searchCustomersAndVendors,
  updateCustomer,
  updateItem
} from './tools';
import { entityPolling, entityWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createInvoice,
    getInvoice,
    createCustomer,
    updateCustomer,
    getCustomer,
    createVendor,
    getVendor,
    createPayment,
    getPayment,
    createBill,
    payBill,
    createItem,
    updateItem,
    createAccount,
    getAccount,
    createEstimate,
    createSalesReceipt,
    getSalesReceipt,
    deleteSalesReceipt,
    createJournalEntry,
    recordExpense,
    getReport,
    queryEntities,
    searchCustomersAndVendors,
    getCompanyInfo
  ],
  triggers: [entityWebhook, entityPolling]
});
