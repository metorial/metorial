import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createBillingPortalSession,
  createCheckoutSession,
  createPaymentLink,
  createRefund,
  getAccount,
  getBalance,
  manageCoupons,
  manageCustomers,
  manageDisputes,
  manageInvoices,
  managePaymentIntents,
  managePaymentMethods,
  managePayouts,
  manageProductsPrices,
  manageSetupIntents,
  manageSubscriptions,
  manageTaxRates,
  searchCharges
} from './tools';
import {
  checkoutEvents,
  customerEvents,
  invoiceEvents,
  paymentEvents,
  payoutEvents,
  subscriptionEvents
} from './triggers';
import { stripeEvents } from './triggers/events-trigger-group';

export let provider = Slate.create({
  spec,
  tools: [
    manageCustomers,
    managePaymentIntents,
    manageSubscriptions,
    manageInvoices,
    manageProductsPrices,
    createRefund,
    createCheckoutSession,
    createPaymentLink,
    managePayouts,
    getAccount,
    getBalance,
    manageCoupons,
    manageDisputes,
    searchCharges,
    manageSetupIntents,
    managePaymentMethods,
    createBillingPortalSession,
    manageTaxRates
  ],
  triggerGroups: [stripeEvents],
  triggers: [
    paymentEvents,
    subscriptionEvents,
    invoiceEvents,
    customerEvents,
    checkoutEvents,
    payoutEvents
  ]
});
