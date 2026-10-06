import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'contentful-graphql',
  name: 'Contentful GraphQL',
  description:
    'Read published or preview content through the Contentful GraphQL Content API, discover the generated schema, and optionally list account spaces with a management token.',
  metadata: {},
  config,
  auth
});
