import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'budibase',
  name: 'Budibase',
  description:
    'Manage low-code internal business applications, tables, rows, users, and queries through the Budibase Public API.',
  metadata: {},
  config,
  auth
});
