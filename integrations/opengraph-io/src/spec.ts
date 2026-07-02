import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'opengraphio',
  name: 'OpenGraph.io',
  description:
    'Web data extraction service for retrieving Open Graph metadata, scraping HTML, capturing screenshots, extracting structured content, and AI-powered page querying.',
  metadata: {},
  config,
  auth
});
