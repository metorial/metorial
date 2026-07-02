import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hunter',
  name: 'Hunter',
  description:
    'B2B data platform for finding, verifying, and enriching professional email addresses and company data. Manage leads, run email sequences, and discover companies at scale.',
  metadata: {},
  config,
  auth
});
