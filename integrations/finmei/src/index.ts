import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInvoice,
  deleteInvoice,
  downloadExpenseFile,
  downloadInvoice,
  getExpense,
  getInvoice,
  getProduct,
  getProfile,
  listCurrencies,
  listCustomers,
  listExpenses,
  listInvoices,
  listPayments,
  listProducts,
  manageCustomer,
  manageExpense,
  managePayment,
  manageProduct,
  updateInvoice
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createInvoice,
    updateInvoice,
    getInvoice,
    getExpense,
    downloadInvoice,
    downloadExpenseFile,
    listInvoices,
    deleteInvoice,
    manageCustomer,
    listCustomers,
    manageProduct,
    listProducts,
    getProduct,
    managePayment,
    listPayments,
    manageExpense,
    listExpenses,
    listCurrencies,
    getProfile
  ],
  triggers: []
});
