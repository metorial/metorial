import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'skyfire',
  name: 'Skyfire',
  description:
    'Payment and identity network for AI agents, enabling autonomous transactions between buyer agents and seller services through token-based protocols.',
  metadata: {},
  config,
  auth
});
