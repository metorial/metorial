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
import { inboundWebhook, newDexTrades, newTokenTransfers } from './triggers';

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
  triggers: [inboundWebhook, newDexTrades, newTokenTransfers]
});
