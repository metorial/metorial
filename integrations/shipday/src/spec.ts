import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shipday',
  name: 'Shipday',
  description:
    'Delivery management platform for local businesses. Manage delivery and pickup orders, carrier/driver fleets, real-time delivery tracking, and on-demand third-party delivery services.',
  metadata: {},
  config,
  auth
});
