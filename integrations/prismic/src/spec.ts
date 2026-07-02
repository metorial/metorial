import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'prismic',
  name: 'Prismic',
  description:
    'Headless CMS with a content repository, REST/GraphQL APIs, content modeling via custom types and slices, and built-in image optimization.',
  metadata: {},
  config,
  auth
});
