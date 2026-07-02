import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export const spec = SlateSpecification.create({
  key: 'natural',
  name: 'Natural',
  description:
    'Manage Natural agents, wallets, payments, transfers, payment requests, approvals, keys, webhooks, and events through the REST API.',
  metadata: {},
  config,
  auth
});
