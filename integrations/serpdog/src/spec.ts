import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'serpdog',
  name: 'Serpdog',
  description:
    'SERP scraping and web data extraction API for Google, Bing, Amazon, Walmart, Yelp, LinkedIn, and YouTube. Supports search results, maps, news, shopping, scholar, images, videos, finance, jobs, and general web scraping.',
  metadata: {},
  config,
  auth
});
