import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'appsmith',
  name: 'Appsmith',
  description:
    'Read and manage Appsmith workspaces and applications through version-sensitive dashboard session APIs, download sanitized application definitions, and acknowledge controlled workflow webhooks. Native password login and supported instance versions are required; audit-log API access is unverified.',
  metadata: {},
  config,
  auth
});
