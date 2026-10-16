import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sidetracker',
  name: 'Sidetracker',
  description:
    'Cookie-free marketing analytics platform that tracks website traffic, sales funnels, customer journeys, and marketing expenses. Inspect the connected account, create and manage conversion lists, search converted sessions, enrich visitor sessions with metadata, attribute revenue, update sales statuses, and execute triggers programmatically.',
  metadata: {},
  config,
  auth
});
