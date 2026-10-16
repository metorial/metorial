import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'owl-protocol',
  name: 'Owl Protocol',
  description:
    'Deploy ERC721 collections, mint tokens, manage project users and metadata, and discover project contracts and user tokens on supported EVM-compatible blockchains.',
  metadata: {},
  config,
  auth
});
