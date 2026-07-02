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
import { paymentEvents, subscriptionEvents } from './triggers';

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
  triggers: [paymentEvents, subscriptionEvents]
});
