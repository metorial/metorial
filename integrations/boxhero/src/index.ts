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
  triggers: []
});
