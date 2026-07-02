import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'heartbeat',
  name: 'Heartbeat',
  description:
    'Manage an online community on Heartbeat. Create and manage members, groups, threads, channels, events, direct messages, and invitations.',
  metadata: {},
  config,
  auth
});
