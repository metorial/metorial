import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bitquery',
  name: 'Bitquery',
  description:
    'Query real-time and historical blockchain data across 40+ networks including Ethereum, Solana, Bitcoin, and Polygon. Access DEX trades, token transfers, balances, NFT data, smart contract events, and more through a unified GraphQL interface.',
  metadata: {},
  config,
  auth
});
