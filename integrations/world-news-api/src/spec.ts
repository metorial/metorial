import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'world-news-api',
  name: 'World News API',
  description: undefined,
  metadata: {},
  config,
  auth
});
