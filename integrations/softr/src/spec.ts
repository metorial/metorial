import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'softr',
  name: 'Softr',
  description:
    'No-code platform for building web applications. Manage app users, databases, tables, fields, and records through the Studio API and Database API.',
  metadata: {},
  config,
  auth
});
