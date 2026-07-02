import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'servicenow',
  name: 'ServiceNow',
  description:
    'Cloud-based IT service management platform for automating workflows, managing incidents, changes, problems, and requests, and integrating with enterprise systems.',
  metadata: {},
  config,
  auth
});
