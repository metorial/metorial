import { Slate } from 'slates';
import { spec } from './spec';
import {
  listCustomers,
  listLocations,
  listSubscribers,
  listTransactions,
  listVouchers,
  verifyCredentials
} from './tools';
import {
  customerCreated,
  macTransactionCreated,
  paidTransactionCreated,
  socialTransactionCreated,
  subscriberCreated,
  voucherTransactionCreated
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listLocations,
    listCustomers,
    listSubscribers,
    listVouchers,
    listTransactions,
    verifyCredentials
  ],
  triggers: [
    customerCreated,
    subscriberCreated,
    macTransactionCreated,
    voucherTransactionCreated,
    socialTransactionCreated,
    paidTransactionCreated
  ]
});
