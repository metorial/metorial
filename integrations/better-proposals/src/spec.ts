import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'better-proposals',
  name: 'Better Proposals',
  description:
    'Create, send, and track professional business proposals, contracts, and sales documents with digital signatures, payment collection, and analytics.',
  metadata: {},
  config,
  auth
});
