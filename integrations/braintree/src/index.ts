import { Slate } from 'slates';
import { spec } from './spec';
import {
  acceptDispute,
  addDisputeEvidence,
  cancelSubscription,
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
    findTransaction,
    searchTransactions,
    refundTransaction,
    voidTransaction,
    settleTransaction,
    createCustomer,
    updateCustomer,
    findCustomer,
    deleteCustomer,
    createSubscription,
    findSubscription,
    updateSubscription,
    cancelSubscription,
    findDispute,
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
