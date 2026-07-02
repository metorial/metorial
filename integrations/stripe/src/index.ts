import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createBillingPortalSession,
  createCheckoutSession,
  createPaymentLink,
  createRefund,
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
    getBalance,
    manageCoupons,
    manageDisputes,
    searchCharges,
    manageSetupIntents,
    managePaymentMethods,
    createBillingPortalSession,
    manageTaxRates
  ],
  triggers: [
    paymentEvents,
    subscriptionEvents,
    invoiceEvents,
    customerEvents,
    checkoutEvents,
    payoutEvents
  ]
});
