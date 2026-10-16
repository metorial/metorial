import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'node',
    name: 'Node API',
    description:
      'Read EVM blockchain state, inspect transactions, call contracts, and broadcast signed transactions.',
    tools: [
      callContract,
      getBlockInfo,
      getLogs,
      getNetworkInfo,
      getTransaction,
      getWalletBalance,
      sendRawTransaction
    ]
  }),
  toolCategory({
    key: 'tokens',
    name: 'Token API',
    description: 'Read ERC-20 balances, metadata, and spending allowances.',
    tools: [getTokenBalances, getTokenMetadata, getTokenAllowance]
  }),
  toolCategory({
    key: 'transfers',
    name: 'Transfers API',
    description: 'Search indexed historical asset transfers.',
    tools: [getTransfers]
  }),
  toolCategory({
    key: 'nft',
    name: 'NFT API',
    description: 'Look up NFT metadata, wallet holdings, and owners.',
    tools: [getNFTs, getNFTOwners]
  }),
  toolCategory({
    key: 'prices',
    name: 'Prices API',
    description: 'Look up current token prices by network and contract.',
    tools: [getTokenPrices]
  }),
  toolCategory({
    key: 'simulation',
    name: 'Legacy Transaction Simulation',
    description:
      'Retired simulation tools preserved for existing workflows. Alchemy ended these APIs on September 30, 2026.',
    tools: [simulateTransaction]
  })
];
