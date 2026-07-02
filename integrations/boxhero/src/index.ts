import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTransaction,
  getTeam,
  listAttributes,
  listItems,
  listLocations,
  listPartners,
  listTransactions
} from './tools';
import { itemEvents, transactionEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listItems,
    listTransactions,
    createTransaction,
    listLocations,
    listPartners,
    listAttributes,
    getTeam
  ],
  triggers: [transactionEvents, itemEvents]
});
