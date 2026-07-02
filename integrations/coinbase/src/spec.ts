import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'coinbase',
  name: 'Coinbase',
  description:
    'Coinbase cryptocurrency exchange platform for buying, selling, sending, and managing digital assets.',
  metadata: {},
  config,
  auth
});
