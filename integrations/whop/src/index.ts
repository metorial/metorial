import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCheckout,
  getPayment,
  getUser,
  listInvoices,
  listMembers,
  listMemberships,
  listPayments,
  listPlans,
  listProducts,
  manageMembership,
  managePlan,
  manageProduct,
  managePromoCode,
  refundPayment
} from './tools';
import { entryEvents, membershipEvents, paymentEvents, setupIntentEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    manageProduct,
    listPlans,
    managePlan,
    listMemberships,
    manageMembership,
    listPayments,
    getPayment,
    refundPayment,
    createCheckout,
    managePromoCode,
    listMembers,
    getUser,
    listInvoices
  ],
  triggers: [paymentEvents, membershipEvents, setupIntentEvents, entryEvents]
});
