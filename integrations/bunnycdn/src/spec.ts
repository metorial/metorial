import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bunnycdn',
  name: 'Bunny CDN',
  description:
    'Integration with bunny.net for managing CDN pull zones, edge storage, video streaming, DNS zones, cache purging, and usage statistics.',
  metadata: {},
  config,
  auth
});
