import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shortenrest',
  name: 'Shorten.REST',
  description:
    'URL shortening API for creating and managing short URLs with custom domains, geo/OS-based redirect targeting, click tracking analytics, and meta tag customization.',
  metadata: {},
  config,
  auth
});
