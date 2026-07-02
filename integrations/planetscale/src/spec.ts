import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'planetscale',
  name: 'PlanetScale',
  description:
    'Manage PlanetScale databases, branches, deploy requests, passwords, backups, and webhooks. Supports both Vitess (MySQL-compatible) and PostgreSQL-compatible databases.',
  metadata: {},
  config,
  auth
});
