import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';
export const spec = SlateSpecification.create({
  key: 'context-dev',
  name: 'Context.dev',
  description:
    'Search and read the web, retrieve company intelligence, parse documents, and manage batches and recurring website monitors.',
  metadata: {},
  auth,
  config
});
