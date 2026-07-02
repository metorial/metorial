import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'webscraper-io',
  name: 'Web Scraper',
  description:
    'Web scraping platform for extracting structured data from websites using sitemaps, scraping jobs, and schedulers.',
  metadata: {},
  config,
  auth
});
