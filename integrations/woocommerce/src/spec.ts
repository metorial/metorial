import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'woocommerce',
  name: 'WooCommerce',
  description:
    'Manage your WooCommerce store including products, orders, customers, coupons, shipping, taxes, and more.',
  metadata: {},
  config,
  auth
});
