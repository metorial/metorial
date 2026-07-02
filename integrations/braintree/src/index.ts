import { Slate } from 'slates';
import { spec } from './spec';
import {
  acceptDispute,
  addDisputeEvidence,
  cancelSubscription,
  createClientToken,
  createCustomer,
  createSubscription,
  createTransaction,
  deleteCustomer,
  deletePaymentMethod,
  finalizeDispute,
  findCustomer,
  findDispute,
  findPaymentMethod,
  findSubscription,
  findTransaction,
  getSettlementReport,
  refundTransaction,
  searchCustomers,
  searchDisputes,
  searchSubscriptions,
  searchTransactions,
  settleTransaction,
  updateCustomer,
  updateSubscription,
  vaultPaymentMethod,
  voidTransaction
} from './tools';
import { webhookEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTransaction,
    createClientToken,
    findTransaction,
    searchTransactions,
    refundTransaction,
    voidTransaction,
    settleTransaction,
    createCustomer,
    updateCustomer,
    findCustomer,
    searchCustomers,
    deleteCustomer,
    createSubscription,
    findSubscription,
    updateSubscription,
    cancelSubscription,
    searchSubscriptions,
    findDispute,
    searchDisputes,
    acceptDispute,
    addDisputeEvidence,
    finalizeDispute,
    vaultPaymentMethod,
    findPaymentMethod,
    deletePaymentMethod,
    getSettlementReport
  ],
  triggers: [webhookEvents]
});
