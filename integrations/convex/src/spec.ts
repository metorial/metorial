import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'convex',
  name: 'Convex',
  description:
    'Convex is a backend-as-a-service platform providing a reactive database, serverless TypeScript functions, file storage, and real-time sync.',
  metadata: {},
  config,
  auth
});
