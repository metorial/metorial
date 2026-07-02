import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lemon-squeezy',
  name: 'Lemon Squeezy',
  description:
    'Lemon Squeezy is a merchant-of-record platform for selling digital products, software, and subscriptions. Manage stores, products, variants, prices, files, orders, order items, customers, subscriptions, subscription invoices, subscription items, discounts, discount redemptions, license keys, checkouts, and webhooks.',
  metadata: {},
  config,
  auth
});
