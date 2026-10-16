import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFeatures,
  manageBalance,
  manageCustomerSettings,
  manageCustomers,
  manageInvoices,
  manageOffers,
  manageSubscriptions,
  manageUsages,
  quotePricing
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getFeatures,
    manageCustomers,
    manageSubscriptions,
    manageUsages,
    manageOffers,
    manageInvoices,
    manageBalance,
    manageCustomerSettings,
    quotePricing
  ],
  triggers: []
});
