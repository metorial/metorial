import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apolloio',
  name: 'Apollo.io',
  description:
    'B2B sales intelligence and engagement platform providing access to contact and company data, enrichment, prospecting, deal tracking, and sequence management.',
  metadata: {},
  config,
  auth
});
