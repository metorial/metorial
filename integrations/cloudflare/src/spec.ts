import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cloudflare',
  name: 'Cloudflare',
  description:
    'Internet infrastructure platform providing CDN, DNS, DDoS protection, serverless computing (Workers), object storage (R2), Zero Trust networking, and more.',
  metadata: {},
  config,
  auth
});
