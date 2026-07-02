import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apify',
  name: 'Apify',
  description:
    'Cloud platform for web scraping, browser automation, and data extraction with a marketplace of pre-built Actors.',
  metadata: {},
  config,
  auth
});
