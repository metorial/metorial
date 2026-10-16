import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'alchemy',
  name: 'Alchemy',
  description:
    'Query EVM blockchain state, token balances and allowances, historical transfers, NFT metadata and ownership, and current token prices through Alchemy. Broadcast signed transactions. Legacy transaction simulation is retained after provider retirement.',
  metadata: {},
  config,
  auth
});
