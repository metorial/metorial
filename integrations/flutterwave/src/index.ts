import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRefund,
  createTransfer,
  createVirtualAccount,
  getBillPayment,
  getTransactionFee,
  getTransferRate,
  getVirtualAccount,
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
    manageBeneficiaries,
    getVirtualAccount,
    getBillPayment
  ],
  triggers: []
});
