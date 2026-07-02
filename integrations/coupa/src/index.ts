import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAccount,
  createContract,
  createExpenseReport,
  createInvoice,
  createPurchaseOrder,
  createReceipt,
  createRequisition,
  createSupplier,
  createUser,
  getInvoice,
  getPurchaseOrder,
  processApproval,
  searchAccounts,
  searchApprovals,
  searchContracts,
  searchExpenseReports,
  searchInvoices,
  searchPurchaseOrders,
  searchReceipts,
  searchRequisitions,
  searchSuppliers,
  searchUsers,
  updatePurchaseOrder,
  updateSupplier,
  updateUser
} from './tools';
import {
  expenseReportChanges,
  inboundWebhook,
  invoiceChanges,
  purchaseOrderChanges,
  requisitionChanges,
  supplierChanges
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchPurchaseOrders,
    getPurchaseOrder,
    createPurchaseOrder,
    updatePurchaseOrder,
    searchInvoices,
    getInvoice,
    createInvoice,
    searchSuppliers,
    createSupplier,
    updateSupplier,
    searchRequisitions,
    createRequisition,
    searchExpenseReports,
    createExpenseReport,
    searchContracts,
    createContract,
    searchApprovals,
    processApproval,
    searchUsers,
    createUser,
    updateUser,
    searchAccounts,
    createAccount,
    searchReceipts,
    createReceipt
  ],
  triggers: [
    inboundWebhook,
    purchaseOrderChanges,
    invoiceChanges,
    requisitionChanges,
    expenseReportChanges,
    supplierChanges
  ]
});
