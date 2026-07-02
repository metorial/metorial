import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bigpictureio',
  name: 'Big Picture.io',
  description:
    'B2B company data enrichment platform with 20M+ company profiles. Enrich domains and IP addresses into detailed company profiles with firmographics, technographics, financials, and social data.',
  metadata: {},
  config,
  auth
});
