import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'better-proposals',
  name: 'Better Proposals',
  description:
    'Create and edit business proposals, generate personal recipient links, track document status, and manage templates, covers, companies, quotes, currencies, and settings.',
  metadata: {},
  config,
  auth
});
