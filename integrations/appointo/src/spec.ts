import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'appointo',
  name: 'Appointo',
  description:
    'Manage appointment bookings and scheduling for Shopify stores with Appointo. Create, reschedule, cancel bookings, check availability, configure appointments, and retrieve products and subscription contracts.',
  metadata: {},
  config,
  auth
});
