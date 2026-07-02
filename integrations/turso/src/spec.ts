import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'turso',
  name: 'Turso',
  description:
    'Distributed SQLite-compatible database platform built on libSQL. Manage organizations, groups, databases, locations, members, and API tokens.',
  metadata: {},
  config,
  auth
});
