import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'scrapingant',
  name: 'ScrapingAnt',
  description:
    'Web scraping API that extracts data from websites using headless Chrome browsers, rotating proxies, anti-bot bypass, JavaScript rendering, AI-powered data extraction, and HTML-to-Markdown conversion.',
  metadata: {},
  config,
  auth
});
