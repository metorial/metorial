import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'leadiq',
  name: 'LeadIQ',
  description:
    'B2B sales prospecting and data enrichment platform providing verified contact and company information.',
  metadata: {},
  config,
  auth
});
