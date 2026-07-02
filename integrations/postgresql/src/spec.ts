import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'postgresql',
  name: 'PostgreSQL',
  description:
    'Connect to PostgreSQL databases to query, insert, update, and delete data, manage schemas and tables, and monitor table changes.',
  metadata: {},
  config,
  auth
});
