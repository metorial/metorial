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
  triggers: []
});
