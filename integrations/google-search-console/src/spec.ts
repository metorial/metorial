import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-search-console',
  name: 'Google Search Console',
  description:
    "Monitor your site's presence in Google Search results. Query search traffic analytics, manage site properties and sitemaps, inspect URL indexing status, and run mobile-friendly tests.",
  metadata: {},
  config,
  auth
});
