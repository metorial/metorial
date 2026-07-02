import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'new-relic',
  name: 'New Relic',
  description:
    'Observability platform for APM, infrastructure monitoring, log management, alerting, dashboards, and synthetic monitoring.',
  metadata: {},
  config,
  auth
});
