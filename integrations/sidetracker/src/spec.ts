import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sidetracker',
  name: 'Sidetracker',
  description:
    'Cookie-free marketing analytics platform that tracks website traffic, sales funnels, customer journeys, and marketing expenses. Manage conversion lists, enrich visitor sessions with metadata, attribute revenue, update sales statuses, and execute triggers programmatically.',
  metadata: {},
  config,
  auth
});
