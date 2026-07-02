import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRefund,
  createTransfer,
  createVirtualAccount,
  getTransactionFee,
  getTransferRate,
  listBillCategories,
  listRefunds,
  listSettlements,
  listTransactions,
  listTransfers,
  manageBeneficiaries,
  managePaymentPlans,
  manageSubscriptions,
  payBill,
  resolveBankAccount,
  verifyTransaction
} from './tools';
import { chargeCompleted, subscriptionEvent, transferCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTransactions,
    verifyTransaction,
    createTransfer,
    listTransfers,
    getTransferRate,
    getTransactionFee,
    managePaymentPlans,
    manageSubscriptions,
    createVirtualAccount,
    payBill,
    listBillCategories,
    createRefund,
    listRefunds,
    listSettlements,
    resolveBankAccount,
    manageBeneficiaries
  ],
  triggers: [chargeCompleted, transferCompleted, subscriptionEvent]
});
