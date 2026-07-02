import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'remarkety',
  name: 'Remarkety',
  description:
    'Email and SMS marketing automation platform for eCommerce. Manage customers, orders, products, carts, newsletter subscriptions, and track email/SMS engagement events.',
  metadata: {},
  config,
  auth
});
