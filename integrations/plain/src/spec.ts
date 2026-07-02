import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'plain',
  name: 'Plain',
  description:
    'API-first customer support platform for B2B technical teams. Manage customers, threads, and conversations across email, Slack, chat, and other channels.',
  metadata: {},
  config,
  auth
});
