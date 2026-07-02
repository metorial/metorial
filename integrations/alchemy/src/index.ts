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
import { addressActivity, customWebhook, nftActivity } from './triggers';

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
  triggers: [addressActivity, nftActivity, customWebhook]
});
