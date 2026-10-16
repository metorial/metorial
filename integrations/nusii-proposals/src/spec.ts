import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nusii-proposals',
  name: 'Nusii Proposals',
  description:
    'Create, send, and track proposals, clients, reusable sections, and pricing in Nusii.',
  metadata: {},
  config,
  auth
});
