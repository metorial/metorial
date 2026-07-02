import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'plausible-analytics',
  name: 'Plausible Analytics',
  description:
    'Privacy-friendly web analytics platform. Query analytics data, track pageviews and custom events, manage sites, goals, custom properties, shared links, and guest access.',
  metadata: {},
  config,
  auth
});
