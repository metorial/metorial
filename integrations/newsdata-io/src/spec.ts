import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'newsapi',
  name: 'NewsAPI',
  description:
    'Search news articles, retrieve top headlines, and discover publishers with NewsAPI.org.',
  metadata: {},
  config,
  auth
});
