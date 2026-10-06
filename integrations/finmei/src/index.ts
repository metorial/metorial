import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInvoice,
  deleteInvoice,
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
  manageProduct
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createInvoice,
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
