import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'search-api',
  name: 'Search API',
  description: undefined,
  metadata: {},
  config,
  auth
});
