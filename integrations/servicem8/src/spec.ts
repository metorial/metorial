import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'servicem8',
  name: 'ServiceM8',
  description:
    'Cloud-based field service management platform for small businesses, providing job management, scheduling, client management, invoicing, and staff coordination.',
  metadata: {},
  config,
  auth
});
