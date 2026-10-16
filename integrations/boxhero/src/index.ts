import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTransaction,
  getItem,
  getTeam,
  getTransaction,
  listAttributes,
  listItems,
  listLocations,
  listPartners,
  listTransactions,
  manageItem,
  manageTransaction
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listItems,
    listTransactions,
    createTransaction,
    listLocations,
    listPartners,
    listAttributes,
    getTeam,
    getItem,
    manageItem,
    getTransaction,
    manageTransaction
  ],
  triggers: []
});
