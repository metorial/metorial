import { Slate } from 'slates';
import { spec } from './spec';
import {
  executeQuery,
  getDexTrades,
  getSmartContractEvents,
  getTokenBalance,
  getTokenHolders,
  getTokenPrice,
  getTokenTransfers,
  getTransactions
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    executeQuery,
    getDexTrades,
    getTokenTransfers,
    getTokenBalance,
    getTokenPrice,
    getSmartContractEvents,
    getTransactions,
    getTokenHolders
  ],
  triggers: []
});
