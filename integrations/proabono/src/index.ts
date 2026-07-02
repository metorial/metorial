import { Slate } from 'slates';
import { spec } from './spec';
import {
  manageBalance,
  manageCustomerSettings,
  manageCustomers,
  manageInvoices,
  manageOffers,
  manageSubscriptions,
  manageUsages,
  quotePricing
} from './tools';
import { customerEvents, invoiceAndPaymentEvents, subscriptionEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageCustomers,
    manageSubscriptions,
    manageUsages,
    manageOffers,
    manageInvoices,
    manageBalance,
    manageCustomerSettings,
    quotePricing
  ],
  triggers: [customerEvents, subscriptionEvents, invoiceAndPaymentEvents]
});
