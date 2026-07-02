import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadAttachmentOrBlob,
  getAccount,
  getBackgroundOperation,
  getCustomer,
  getCustomerInvoice,
  getInventoryItem,
  getProject,
  getSalesOrder,
  getSupplier,
  getSupplierInvoice,
  listAccounts,
  listCustomerInvoices,
  listCustomers,
  listInventoryItems,
  listProjects,
  listSalesOrders,
  listSupplierInvoices,
  listSuppliers
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listCustomers,
    getCustomer,
    listSuppliers,
    getSupplier,
    listAccounts,
    getAccount,
    listCustomerInvoices,
    getCustomerInvoice,
    listSupplierInvoices,
    getSupplierInvoice,
    listProjects,
    getProject,
    listInventoryItems,
    getInventoryItem,
    listSalesOrders,
    getSalesOrder,
    downloadAttachmentOrBlob,
    getBackgroundOperation
  ],
  triggers: []
});
