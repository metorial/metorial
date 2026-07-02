import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rocketadmin',
  name: 'Rocketadmin',
  description:
    'Admin panel builder that connects to databases like MySQL, PostgreSQL, MongoDB, and others, providing auto-generated CRUD UI, permissions, and audit logs.',
  metadata: {},
  config,
  auth
});
