import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nango',
  name: 'Nango',
  description:
    'Discover Nango integrations, connections and deployed functions, inspect synced data and manage exact native workflows. Credentials and Connect session tokens are not delivered.',
  metadata: {},
  config,
  auth
});
