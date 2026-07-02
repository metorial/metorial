import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nutshell',
  name: 'Nutshell',
  description:
    'Cloud-based CRM platform for small and medium-sized businesses, providing contact management, lead tracking, sales pipeline management, and activity logging.',
  metadata: {},
  config,
  auth
});
