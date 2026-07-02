import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'close',
  name: 'Close',
  description:
    'Close is a sales CRM platform for small and medium-sized businesses. Manage leads, contacts, opportunities, tasks, activities, email communication, and sales pipeline configuration.',
  metadata: {},
  config,
  auth
});
