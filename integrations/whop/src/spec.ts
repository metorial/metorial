import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'whop',
  name: 'Whop',
  description:
    'Sell digital products, memberships, and subscriptions on the Whop platform. Manage payments, checkout, promo codes, courses, and more.',
  metadata: {},
  config,
  auth
});
