import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'short-menu',
  name: 'Short Menu',
  description:
    'URL shortening and link management platform with branded short links, custom domains, tagging, and click analytics.',
  metadata: {},
  config,
  auth
});
