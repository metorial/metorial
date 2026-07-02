import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'prerender',
  name: 'Prerender',
  description:
    'Prerender.io serves pre-rendered HTML snapshots of JavaScript-heavy web pages to search engine crawlers and social media bots, improving SEO. Manage cached URLs, sitemaps, domains, and rendering settings.',
  metadata: {},
  config,
  auth
});
