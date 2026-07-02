import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  addTracking,
  authorizeOrder,
  captureOrder,
  createInvoice,
  createOrder,
  createSubscription,
  getOrder,
  getPayout,
  listInvoices,
  manageBillingPlan,
  manageDispute,
  manageInvoice,
  managePayment,
  manageProduct,
  manageSubscription,
  searchInvoices,
  searchTransactions,
  sendPayout
} from './tools';
import {
  disputeEvents,
  invoiceEvents,
  orderEvents,
  paymentEvents,
  payoutEvents,
  subscriptionEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createOrder,
    getOrder,
    authorizeOrder,
    captureOrder,
    managePayment,
    createInvoice,
    manageInvoice,
    listInvoices,
    searchInvoices,
    manageProduct,
    manageBillingPlan,
    createSubscription,
    manageSubscription,
    sendPayout,
    getPayout,
    manageDispute,
    searchTransactions,
    addTracking
  ],
  triggers: [
    paymentEvents,
    orderEvents,
    subscriptionEvents,
    invoiceEvents,
    payoutEvents,
    disputeEvents
  ]
});
