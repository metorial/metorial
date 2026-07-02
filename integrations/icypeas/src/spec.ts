import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'icypeas',
  name: 'Icypeas',
  description:
    'B2B data enrichment platform for professional email discovery, email verification, domain scanning, LinkedIn profile scraping, and lead database search.',
  metadata: {},
  config,
  auth
});
