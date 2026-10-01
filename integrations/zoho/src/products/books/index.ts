import { createContact } from './tools/create-contact';
import { createInvoiceTool } from './tools/create-invoice';
import { deleteContact } from './tools/delete-contact';
import { deleteInvoiceTool } from './tools/delete-invoice';
import { getContact } from './tools/get-contact';
import { getInvoiceTool } from './tools/get-invoice';
import { listInvoicesTool } from './tools/list-invoices';
import { listBankAccountsTool, listBankTransactionsTool } from './tools/manage-banking';
import { createBillTool, listBillsTool, updateBillStatusTool } from './tools/manage-bills';
import {
  createJournalEntryTool,
  listChartOfAccountsTool
} from './tools/manage-chart-of-accounts';
import { listContacts } from './tools/manage-contacts';
import { createCreditNoteTool, listCreditNotesTool } from './tools/manage-credit-notes';
import {
  createEstimateTool,
  listEstimatesTool,
  updateEstimateStatusTool
} from './tools/manage-estimates';
import { createExpenseTool, listExpensesTool } from './tools/manage-expenses';
import { createItemTool, listItemsTool, updateItemTool } from './tools/manage-items';
import {
  listCustomerPaymentsTool,
  recordCustomerPaymentTool,
  recordVendorPaymentTool
} from './tools/manage-payments';
import {
  createProjectTool,
  listProjectsTool,
  logTimeEntryTool
} from './tools/manage-projects';
import {
  createPurchaseOrderTool,
  listPurchaseOrdersTool
} from './tools/manage-purchase-orders';
import { createSalesOrderTool, listSalesOrdersTool } from './tools/manage-sales-orders';
import { updateContact } from './tools/update-contact';
import { updateInvoiceTool } from './tools/update-invoice';

export const booksTools = [
  listEstimatesTool,
  createEstimateTool,
  updateEstimateStatusTool,
  deleteContact,
  createContact,
  createInvoiceTool,
  deleteInvoiceTool,
  updateInvoiceTool,
  listItemsTool,
  createItemTool,
  updateItemTool,
  updateContact,
  listContacts,
  listExpensesTool,
  createExpenseTool,
  recordCustomerPaymentTool,
  recordVendorPaymentTool,
  listCustomerPaymentsTool,
  listBillsTool,
  createBillTool,
  updateBillStatusTool,
  listBankAccountsTool,
  listBankTransactionsTool,
  listSalesOrdersTool,
  createSalesOrderTool,
  listInvoicesTool,
  listCreditNotesTool,
  createCreditNoteTool,
  getContact,
  listProjectsTool,
  createProjectTool,
  logTimeEntryTool,
  listChartOfAccountsTool,
  createJournalEntryTool,
  getInvoiceTool,
  listPurchaseOrdersTool,
  createPurchaseOrderTool
];
