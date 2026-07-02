import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tinyurl',
  name: 'TinyURL',
  description:
    'URL shortening service that allows users to create short aliases for long URLs with link management, analytics, and branded domain support.',
  metadata: {},
  config,
  auth
});
