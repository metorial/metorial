import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'starton',
  name: 'Starton',
  description:
    'Web3 infrastructure API for deploying and interacting with smart contracts, managing blockchain transactions, storing files on IPFS, and monitoring on-chain events across EVM-compatible blockchains.',
  metadata: {},
  config,
  auth
});
