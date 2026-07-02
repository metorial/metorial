import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'breathe-hr',
  name: 'Breathe HR',
  description:
    'Cloud-based HR management platform for small to medium-sized businesses. Manage employees, absences, sickness, expenses, training, and organizational structure.',
  metadata: {},
  config,
  auth
});
