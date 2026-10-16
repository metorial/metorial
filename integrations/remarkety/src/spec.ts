import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'remarkety',
  name: 'Remarkety',
  description:
    'Email and SMS marketing automation for eCommerce. Send customer, order, product, cart, and custom events, upload contact batches, and manage newsletter subscriptions and contact unsubscriptions.',
  metadata: {},
  config,
  auth
});
