import { Slate } from 'slates';
import { spec } from './spec';
import {
  callContract,
  getBlockInfo,
  getLogs,
  getNFTOwners,
  getNFTs,
  getTokenBalances,
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
  triggers: []
});
