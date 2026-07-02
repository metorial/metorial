import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'strapi',
  name: 'Strapi',
  description:
    'Open-source headless CMS with custom content types, REST and GraphQL APIs, media management, internationalization, draft/publish workflows, and role-based access control.',
  metadata: {},
  config,
  auth
});
