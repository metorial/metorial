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
  triggers: []
});
