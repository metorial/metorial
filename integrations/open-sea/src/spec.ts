import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'opensea',
  name: 'OpenSea',
  description:
    'OpenSea is the largest NFT marketplace, supporting buying, selling, and trading of NFTs across multiple blockchains including Ethereum, Polygon, Base, Arbitrum, and more.',
  metadata: {},
  config,
  auth
});
