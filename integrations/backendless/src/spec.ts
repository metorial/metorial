import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'backendless',
  name: 'Backendless',
  description:
    'Manage Backendless database records and relations, users, stored files, template emails, channel messages, cache, and counters.',
  metadata: {},
  config,
  auth
});
