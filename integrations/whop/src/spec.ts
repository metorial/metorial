import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'whop',
  name: 'Whop',
  description:
    'Sell digital products, memberships, and subscriptions on the Whop platform. Discover accounts and manage products, plans, memberships, payments, checkout, promo codes, invoices, and user profiles.',
  metadata: {},
  config,
  auth
});
