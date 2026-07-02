import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'scrapfly',
  name: 'Scrapfly',
  description:
    'Web data collection platform offering APIs for web scraping, screenshot capture, AI-powered data extraction, and recursive website crawling with built-in anti-bot bypass and proxy rotation.',
  metadata: {},
  config,
  auth
});
