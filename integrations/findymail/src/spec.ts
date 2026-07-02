import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'findymail',
  name: 'Findymail',
  description:
    'B2B email and phone data enrichment service that finds and verifies professional email addresses, phone numbers, and company information.',
  metadata: {},
  config,
  auth
});
