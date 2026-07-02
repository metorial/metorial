import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'crustdata',
  name: 'Crustdata',
  description:
    'Real-time B2B data platform providing programmatic access to company and people data. Offers firmographic data, growth metrics, job listings, social posts, and web search across 16+ datasets.',
  metadata: {},
  config,
  auth
});
