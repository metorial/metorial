import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cursor',
  name: 'Cursor',
  description:
    'AI-powered code editor integration. Launch and manage cloud agents that work on GitHub repositories, track team usage and spend, manage team members, and configure repository blocklists.',
  metadata: {},
  config,
  auth
});
