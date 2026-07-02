import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'alchemy',
  name: 'Alchemy',
  description:
    'Blockchain development platform providing APIs and infrastructure for interacting with Ethereum, Polygon, Solana, Bitcoin, and 80+ other chains. Offers node access via JSON-RPC, indexed blockchain data APIs for tokens, NFTs, transfers, and prices, smart wallet infrastructure, and real-time webhook notifications.',
  metadata: {},
  config,
  auth
});
