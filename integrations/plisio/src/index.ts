import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDeposit,
  createInvoice,
  estimateFee,
  getBalance,
  getCurrencies,
  getFeePlans,
  getInvoice,
  getOperation,
  getShop,
  listDeposits,
  listOperations,
  withdraw
} from './tools';
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
    createDeposit,
    getShop,
    getInvoice,
    listDeposits
  ],
  triggers: []
});
