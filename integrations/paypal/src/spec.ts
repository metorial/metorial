import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'paypal',
  name: 'PayPal',
  description:
    'Online payments platform for processing payments, managing orders, subscriptions, invoices, payouts, and disputes.',
  metadata: {},
  config,
  auth
});
