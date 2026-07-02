import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'better-stack',
  name: 'Better Stack',
  description:
    'Better Stack is an observability and incident management platform offering uptime monitoring, incident management, on-call scheduling, status pages, log management, and telemetry.',
  metadata: {},
  config,
  auth
});
