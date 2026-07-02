import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'squarespace',
  name: 'Squarespace',
  description:
    'Squarespace is a website builder, hosting, and e-commerce platform. This integration provides access to commerce functionality including products, orders, inventory, customer profiles, and financial transactions.',
  metadata: {},
  config,
  auth
});
