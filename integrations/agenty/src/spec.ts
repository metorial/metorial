import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'agenty',
  name: 'Agenty',
  description:
    'Cloud-based platform for automated web scraping, data extraction, website change detection, and browser automation.',
  metadata: {},
  config,
  auth
});
