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
import { inboundWebhook, newCustomer, newExpense, newInvoice, newPayment } from './triggers';

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
  triggers: [inboundWebhook, newInvoice, newPayment, newCustomer, newExpense]
});
