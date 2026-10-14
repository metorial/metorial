import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCheckout,
  getCheckout,
  getCurrentUser,
  getPayment,
  getUser,
  listAccounts,
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
    listAccounts,
    getCurrentUser,
    getCheckout,
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
