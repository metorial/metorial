import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'poof',
  name: 'Poof',
  description:
    'Create cryptocurrency and fiat payment requests, hosted checkouts, wallets, payouts, and transaction queries.',
  metadata: {},
  config,
  auth
});
