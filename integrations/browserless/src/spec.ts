import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'browserless',
  name: 'Browserless',
  description:
    'Cloud-hosted headless browser service for screenshots, PDFs, scraping, and browser automation.',
  metadata: {},
  config,
  auth
});
