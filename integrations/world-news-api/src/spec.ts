import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'world-news-api',
  name: 'World News API',
  description:
    'Search, retrieve, and extract news articles, discover sources, and prepare newspaper front pages and RSS feeds.',
  metadata: {},
  config,
  auth
});
