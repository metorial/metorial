import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sanity',
  name: 'Sanity',
  description:
    'Query and manage Content Lake documents, projects, datasets, webhooks, and original assets.',
  metadata: {},
  config,
  auth
});
