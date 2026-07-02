import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-analytics',
  name: 'Google Analytics',
  description:
    'Google Analytics 4 integration for querying analytics reports, sending event data via the Measurement Protocol, and managing GA4 properties, data streams, audiences, and custom dimensions/metrics.',
  metadata: {},
  config,
  auth
});
