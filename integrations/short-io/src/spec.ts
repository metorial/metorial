import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'short-io',
  name: 'Short.io',
  description:
    'URL shortening and link management platform for creating branded short links, tracking analytics, and managing links programmatically.',
  metadata: {},
  config,
  auth
});
