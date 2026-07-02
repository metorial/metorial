import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shopify',
  name: 'Shopify',
  description:
    'E-commerce platform for creating and managing online stores, handling inventory, processing orders, managing customers, and selling across multiple channels.',
  metadata: {},
  config,
  auth
});
