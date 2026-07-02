import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'parsehub',
  name: 'ParseHub',
  description:
    'Web scraping platform that extracts structured data from websites. Manage scraping projects, run scraping jobs, and retrieve extracted data.',
  metadata: {},
  config,
  auth
});
