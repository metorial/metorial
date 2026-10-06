import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelSubscription,
  createPlan,
  getCompany,
  getCustomer,
  getPayment,
  listCustomers,
  listPayments,
  listPlans,
  listSubscriptions,
  refundPayment,
  updateCompany,
  updatePlan
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listPlans,
    createPlan,
    updatePlan,
    listPayments,
    getPayment,
    listCustomers,
    getCustomer,
    listSubscriptions,
    cancelSubscription,
    refundPayment,
    getCompany,
    updateCompany
  ],
  triggers: []
});
