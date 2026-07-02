import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zenrows',
  name: 'ZenRows',
  description:
    'Web scraping toolkit with Universal Scraper API, industry-specific Scraper APIs for e-commerce and real estate, and Google SERP extraction.',
  metadata: {},
  config,
  auth
});
