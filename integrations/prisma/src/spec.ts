import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'prisma',
  name: 'Prisma',
  description:
    'Provision and manage Prisma Postgres databases, projects, and workspaces through the Prisma Data Platform Management API.',
  metadata: {},
  config,
  auth
});
