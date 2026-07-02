import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cloudcart',
  name: 'CloudCart',
  description:
    'CloudCart is a SaaS e-commerce platform for creating and managing online stores. Manage products, orders, customers, categories, and inventory through a unified API.',
  metadata: {},
  config,
  auth
});
