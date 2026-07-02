import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'instacart',
  name: 'Instacart',
  description:
    'Grocery delivery and pickup platform. Create shoppable recipe pages, manage orders, discover retailers, and track deliveries via the Developer Platform and Connect APIs.',
  metadata: {},
  config,
  auth
});
