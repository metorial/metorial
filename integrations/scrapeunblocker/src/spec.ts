import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'scrapeunblocker',
  name: 'ScrapeUnblocker',
  description:
    'Web scraping toolkit that renders pages in a real browser behind anti-bot protections, returning raw HTML or AI-parsed JSON, plus Google SERP extraction.',
  metadata: {},
  config,
  auth
});
