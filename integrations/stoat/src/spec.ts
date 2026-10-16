import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stoat',
  name: 'Stoat',
  description:
    'Read and manage Stoat chat messages, channels, servers, members, roles, and webhooks.',
  metadata: {},
  config,
  auth
});
