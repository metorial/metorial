import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'keenio',
  name: 'Keen.io',
  description:
    'Collect, store, and analyze custom event data with event recording, analytical queries, funnels, saved queries, and cached datasets.',
  metadata: {},
  config,
  auth
});
