import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'algolia',
  name: 'Algolia',
  description:
    'Search-and-discovery API platform providing hosted full-text search, analytics, recommendations, and personalization.',
  metadata: {},
  config,
  auth
});
