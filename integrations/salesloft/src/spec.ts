import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'salesloft',
  name: 'SalesLoft',
  description:
    'Manage people, accounts and notes; discover cadences and memberships; read email, call, task and template activity; and log completed external calls.',
  metadata: {},
  config,
  auth
});
