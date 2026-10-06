import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'strapi',
  name: 'Strapi',
  description:
    'Read and manage authorized content entries and media in a configured Strapi 4 or 5 instance using its Content REST API.',
  metadata: {},
  config,
  auth
});
