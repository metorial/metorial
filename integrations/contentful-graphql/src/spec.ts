import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'contentful-graphql',
  name: 'Contentful GraphQL',
  description:
    'Query and preview content from Contentful using the GraphQL Content API. Supports published and draft content, schema introspection, and real-time webhooks for content changes.',
  metadata: {},
  config,
  auth
});
