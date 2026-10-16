import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  callContract,
  getBlockInfo,
  getLogs,
  getNetworkInfo,
  getNFTOwners,
  getNFTs,
  getTokenAllowance,
  getTokenBalances,
  getTokenMetadata,
  getTokenPrices,
  getTransaction,
  getTransfers,
  getWalletBalance,
  sendRawTransaction,
  simulateTransaction
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getNetworkInfo,
    getTokenMetadata,
    getTokenAllowance,
    getTokenBalances,
    getTransfers,
    getNFTs,
    getTokenPrices,
    simulateTransaction,
    getBlockInfo,
    getTransaction,
    getWalletBalance,
    getNFTOwners,
    getLogs,
    sendRawTransaction,
    callContract
  ],
  toolCategories,
  triggers: []
});
