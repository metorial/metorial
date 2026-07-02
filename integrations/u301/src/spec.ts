import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'u301',
  name: 'U301',
  description:
    'URL shortening and link management service. Create shortened URLs with custom domains and slugs, generate QR codes, and manage short links.',
  metadata: {},
  config,
  auth
});
