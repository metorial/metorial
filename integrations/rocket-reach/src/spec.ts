import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rocketreach',
  name: 'RocketReach',
  description:
    'Search professional and company previews, enrich selected records, check lookup progress, and monitor account credits. Enrichment can consume credits and retain history.',
  metadata: {},
  config,
  auth
});
