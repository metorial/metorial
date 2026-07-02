import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'datagma',
  name: 'Datagma',
  description:
    'B2B data enrichment platform providing real-time contact and company information. Enrich profiles with 75+ data points, find verified work emails, mobile phone numbers, detect job changes, and more.',
  metadata: {},
  config,
  auth
});
