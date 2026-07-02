import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'owl-protocol',
  name: 'Owl Protocol',
  description:
    'Web3 developer platform for deploying and managing smart contracts and digital assets (ERC20, ERC721, ERC1155) across EVM-compatible blockchains via REST API without private keys or crypto.',
  metadata: {},
  config,
  auth
});
