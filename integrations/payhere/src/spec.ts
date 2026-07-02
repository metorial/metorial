import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'payhere',
  name: 'Payhere',
  description:
    'Payment platform for collecting one-off and recurring payments, managing subscriptions, customers, and refunds.',
  metadata: {},
  config,
  auth
});
