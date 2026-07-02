import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDeposit,
  createInvoice,
  estimateFee,
  getBalance,
  getCurrencies,
  getFeePlans,
  getOperation,
  listOperations,
  withdraw
} from './tools';
import { invoiceStatus } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createInvoice,
    withdraw,
    listOperations,
    getOperation,
    getBalance,
    getCurrencies,
    estimateFee,
    getFeePlans,
    createDeposit
  ],
  triggers: [invoiceStatus]
});
