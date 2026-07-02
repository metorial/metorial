import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'firecrawl',
  name: 'Firecrawl',
  description:
    'Web data platform for scraping, crawling, searching, mapping, parsing files, extracting structured data, running browser sessions, monitoring page changes, and inspecting account usage.',
  metadata: {},
  config,
  auth
});
